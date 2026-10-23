// Adopts the scene lifecycle required when linking against the iOS 27 SDK.
// Keeps this native migration reproducible after Expo prebuild.
const fs = require("fs");
const path = require("path");
const {
  withAppDelegate,
  withInfoPlist,
  withPodfile,
} = require("expo/config-plugins");

const legacySwiftWindow = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif`;

const swiftSceneDelegate = `
// iOS 27 requires the scene lifecycle, including for single-window apps.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?
  private var appDelegate: AppDelegate? { UIApplication.shared.delegate as? AppDelegate }

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene,
      let delegate = appDelegate, let factory = delegate.reactNativeFactory else { return }
    let window = UIWindow(windowScene: windowScene)
    self.window = window
    delegate.window = window
    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = options.urlContexts.first?.url { launchOptions[.url] = url }
    if let activity = options.userActivities.first {
      launchOptions[.userActivityDictionary] = [
        "UIApplicationLaunchOptionsUserActivityTypeKey": activity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": activity
      ]
    }
    factory.startReactNative(withModuleName: "main", in: window, launchOptions: launchOptions)
  }

  func sceneDidBecomeActive(_ scene: UIScene) { appDelegate?.applicationDidBecomeActive(UIApplication.shared) }
  func sceneWillResignActive(_ scene: UIScene) { appDelegate?.applicationWillResignActive(UIApplication.shared) }
  func sceneWillEnterForeground(_ scene: UIScene) { appDelegate?.applicationWillEnterForeground(UIApplication.shared) }
  func sceneDidEnterBackground(_ scene: UIScene) { appDelegate?.applicationDidEnterBackground(UIApplication.shared) }
  func scene(_ scene: UIScene, openURLContexts contexts: Set<UIOpenURLContext>) {
    for context in contexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [.openInPlace: context.options.openInPlace]
      if let value = context.options.sourceApplication { options[.sourceApplication] = value }
      if let value = context.options.annotation { options[.annotation] = value }
      _ = appDelegate?.application(UIApplication.shared, open: context.url, options: options)
    }
  }
  func scene(_ scene: UIScene, continue activity: NSUserActivity) {
    _ = appDelegate?.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
  }
}
`;

const objcSceneDelegate = `

@interface SceneDelegate : UIResponder <UIWindowSceneDelegate>
@property (nonatomic, strong) UIWindow *window;
@end

@implementation SceneDelegate
- (AppDelegate *)appDelegate { return (AppDelegate *)UIApplication.sharedApplication.delegate; }
- (void)scene:(UIScene *)scene willConnectToSession:(UISceneSession *)session options:(UISceneConnectionOptions *)options {
  if (![scene isKindOfClass:UIWindowScene.class]) return;
  AppDelegate *delegate = [self appDelegate];
  NSMutableDictionary *launchOptions = [NSMutableDictionary new];
  UIOpenURLContext *urlContext = options.URLContexts.anyObject;
  if (urlContext) launchOptions[UIApplicationLaunchOptionsURLKey] = urlContext.URL;
  NSUserActivity *activity = options.userActivities.anyObject;
  if (activity) launchOptions[UIApplicationLaunchOptionsUserActivityDictionaryKey] = @{
    @"UIApplicationLaunchOptionsUserActivityTypeKey": activity.activityType,
    @"UIApplicationLaunchOptionsUserActivityKey": activity
  };
  UIView *rootView = [delegate.rootViewFactory viewWithModuleName:delegate.moduleName initialProperties:delegate.initialProps launchOptions:launchOptions];
  UIViewController *controller = [delegate createRootViewController];
  [delegate setRootView:rootView toRootViewController:controller];
  self.window = [[UIWindow alloc] initWithWindowScene:(UIWindowScene *)scene];
  delegate.window = self.window;
  self.window.rootViewController = controller;
  [self.window makeKeyAndVisible];
}
- (void)sceneDidBecomeActive:(UIScene *)scene {
  id delegate = [self appDelegate];
  if ([delegate respondsToSelector:@selector(applicationDidBecomeActive:)]) [delegate applicationDidBecomeActive:UIApplication.sharedApplication];
}
- (void)sceneWillResignActive:(UIScene *)scene {
  id delegate = [self appDelegate];
  if ([delegate respondsToSelector:@selector(applicationWillResignActive:)]) [delegate applicationWillResignActive:UIApplication.sharedApplication];
}
- (void)sceneWillEnterForeground:(UIScene *)scene {
  id delegate = [self appDelegate];
  if ([delegate respondsToSelector:@selector(applicationWillEnterForeground:)]) [delegate applicationWillEnterForeground:UIApplication.sharedApplication];
}
- (void)sceneDidEnterBackground:(UIScene *)scene {
  id delegate = [self appDelegate];
  if ([delegate respondsToSelector:@selector(applicationDidEnterBackground:)]) [delegate applicationDidEnterBackground:UIApplication.sharedApplication];
}
- (void)scene:(UIScene *)scene openURLContexts:(NSSet<UIOpenURLContext *> *)contexts {
  for (UIOpenURLContext *context in contexts) {
    NSMutableDictionary *options = [NSMutableDictionary dictionaryWithObject:@(context.options.openInPlace) forKey:UIApplicationOpenURLOptionsOpenInPlaceKey];
    if (context.options.sourceApplication) options[UIApplicationOpenURLOptionsSourceApplicationKey] = context.options.sourceApplication;
    if (context.options.annotation) options[UIApplicationOpenURLOptionsAnnotationKey] = context.options.annotation;
    [[self appDelegate] application:UIApplication.sharedApplication openURL:context.URL options:options];
  }
}
- (void)scene:(UIScene *)scene continueUserActivity:(NSUserActivity *)activity {
  [[self appDelegate] application:UIApplication.sharedApplication continueUserActivity:activity restorationHandler:^(NSArray<id<UIUserActivityRestoring>> *restorers) {}];
}
@end
`;

// The iOS 27 SDK rejects targets below iOS 15. Pod resource bundles (e.g. AsyncStorage's)
// inherit the pod's own minimum, so align them with the app's deployment target.
const resourceBundleSigning =
  "config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'";
const resourceBundleTarget =
  "config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = podfile_properties['ios.deploymentTarget'] || '15.1'";

// fmt 11 (bundled with React Native 0.76) fails consteval checks under the iOS 27 toolchain
// in C++20; compiling only that pod as C++17 keeps its format strings runtime-checked.
const xcode14Comment = "    # This is necessary for Xcode 14";
const fmtCxx17 = `    installer.pods_project.targets.each do |target|
      next unless target.name == 'fmt'
      target.build_configurations.each do |config|
        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
      end
    end

`;

module.exports = function withIosSceneLifecycle(config) {
  const expoRoot = path.dirname(require.resolve("expo/package.json"));
  const expoMajor = Number(
    require(path.join(expoRoot, "package.json")).version.split(".")[0],
  );
  const nativeExpoScenes = fs.existsSync(
    path.join(expoRoot, "ios/AppDelegates/ExpoAppSceneDelegate.swift"),
  );

  config = withPodfile(config, (mod) => {
    let podfile = mod.modResults.contents;
    if (
      !podfile.includes(resourceBundleSigning) ||
      !podfile.includes(xcode14Comment)
    )
      throw new Error(
        "withIosSceneLifecycle: inspect the Podfile post_install before migrating.",
      );
    if (!podfile.includes(resourceBundleTarget))
      podfile = podfile.replace(
        resourceBundleSigning,
        `${resourceBundleSigning}\n          ${resourceBundleTarget}`,
      );
    if (!podfile.includes(fmtCxx17))
      podfile = podfile.replace(xcode14Comment, fmtCxx17 + xcode14Comment);
    mod.modResults.contents = podfile;
    return mod;
  });

  config = withInfoPlist(config, (mod) => {
    if (mod.modResults.UIApplicationSceneManifest?.UISceneConfigurations)
      return mod;
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName:
              expoMajor >= 53
                ? "$(PRODUCT_MODULE_NAME).SceneDelegate"
                : "SceneDelegate",
          },
        ],
      },
    };
    return mod;
  });

  return withAppDelegate(config, (mod) => {
    let source = mod.modResults.contents;
    if (/class SceneDelegate\s*[:{]|@interface SceneDelegate\s*:/.test(source))
      return mod;
    if (mod.modResults.language === "swift") {
      if (!source.includes(legacySwiftWindow)) {
        throw new Error(
          "withIosSceneLifecycle: inspect the Swift AppDelegate before migrating its window initialization.",
        );
      }
      source = source.replace(
        legacySwiftWindow,
        "// The scene delegate creates the window and starts React Native.",
      );
      if (nativeExpoScenes) {
        const declaration = "class AppDelegate: ExpoAppDelegate {";
        if (!source.includes(declaration))
          throw new Error(
            "withIosSceneLifecycle: unexpected Expo AppDelegate declaration.",
          );
        source = source.replace(
          declaration,
          "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {",
        );
        source += "\nclass SceneDelegate: ExpoAppSceneDelegate {}\n";
      } else {
        source += swiftSceneDelegate;
      }
    } else if (["objc", "objcpp"].includes(mod.modResults.language)) {
      const moduleName = '  self.moduleName = @"main";';
      if (!source.includes(moduleName))
        throw new Error(
          "withIosSceneLifecycle: inspect the Objective-C AppDelegate before migrating.",
        );
      source = source.replace(
        moduleName,
        "  self.automaticallyLoadReactNativeWindow = NO;\n" + moduleName,
      );
      source += objcSceneDelegate;
    } else {
      throw new Error(
        "withIosSceneLifecycle: unsupported AppDelegate language.",
      );
    }
    mod.modResults.contents = source;
    return mod;
  });
};
