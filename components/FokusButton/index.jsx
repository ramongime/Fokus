import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, fontSizes, radii } from "../../constants/theme";
import { IconPause, IconPlay } from "../Icons";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const FokusButton = ({ onPress, title, icon, outline, running }) => {
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [progress] = useState(() => new Animated.Value(running ? 1 : 0));
  const useNativeDriver = Platform.OS !== "web";

  useEffect(() => {
    if (typeof running === "boolean") {
      Animated.timing(progress, {
        toValue: running ? 1 : 0,
        duration: 320,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
        useNativeDriver,
      }).start();
    }
  }, [running, progress, useNativeDriver]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      tension: 120,
      friction: 9,
      useNativeDriver,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver,
    }).start();
  };

  const isToggleMode = typeof running === "boolean";

  // Transição contínua fluida: nunca deixa o conteúdo invisível no meio
  const playOpacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.35, 0],
  });
  const playScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.76],
  });
  const playTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -16],
  });
  const playRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-25deg"],
  });

  const pauseOpacity = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.35, 1],
  });
  const pauseScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.76, 1],
  });
  const pauseTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });
  const pauseRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["25deg", "0deg"],
  });

  return (
    <AnimatedPressable
      style={[
        styles.button,
        outline && styles.outlineButton,
        { transform: [{ scale: scaleAnim }] },
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={title ?? (running ? "Pausar" : "Começar")}
    >
      {isToggleMode ? (
        <View style={styles.container}>
          {/* Camada Começar */}
          <Animated.View
            pointerEvents={running ? "none" : "auto"}
            style={[
              styles.contentRow,
              {
                opacity: playOpacity,
                transform: [
                  { translateY: playTranslateY },
                  { scale: playScale },
                  { rotate: playRotate },
                ],
              },
            ]}
          >
            <IconPlay />
            <Text style={styles.buttonText}>Começar</Text>
          </Animated.View>

          {/* Camada Pausar */}
          <Animated.View
            pointerEvents={running ? "auto" : "none"}
            style={[
              styles.contentRow,
              styles.absoluteLayer,
              {
                opacity: pauseOpacity,
                transform: [
                  { translateY: pauseTranslateY },
                  { scale: pauseScale },
                  { rotate: pauseRotate },
                ],
              },
            ]}
          >
            <IconPause />
            <Text style={styles.buttonText}>Pausar</Text>
          </Animated.View>
        </View>
      ) : (
        <View style={styles.contentRow}>
          {icon}
          <Text
            style={[styles.buttonText, outline && styles.outlineButtonText]}
          >
            {title}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  container: {
    width: "100%",
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  contentRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  absoluteLayer: {
    position: "absolute",
  },
  buttonText: {
    textAlign: "center",
    color: colors.background,
    fontSize: fontSizes.md,
    fontWeight: "bold",
  },
  outlineButtonText: {
    color: colors.primary,
  },
});
