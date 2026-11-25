# 0008. Decoupled Foreground Audio Engine

**Status**: Accepted  
**Date**: 2026-11-19  

## Context

In ADR 0007, cycle completion alerts in foreground were delivered by `playCycleSound` inside `components/context/timerNotifications.js`, delegating immediate playback to `expo-notifications` (`scheduleNotificationAsync`). While this kept a single code path for native sounds, it introduced three concrete architectural and UX defects (tracked in `ROADMAP.md` Section 1):

1. **Permission-Coupled Foreground Silence**: `playCycleSound` checked `ensurePermission()` before scheduling an immediate notification. Whenever a user denied or revoked OS notification permissions, foreground completion alerts silently failed—violating the core invariant that an active Pomodoro timer must never finish silently while open on screen.
2. **Visual Clutter in Foreground**: Delivering immediate local OS notifications while the user is actively watching the countdown displayed intrusive system banners/toasts over the minimalist dark UI, and triggered duplicate notification sound/vibration alongside in-app state transitions.
3. **Blurred Platform Ownership on Web**: `components/context/timerNotifications.web.js` combined Web Audio API oscillator synthesis and audio-clock alarm scheduling with notification stubs, conflating audio playback concerns with OS notification orchestration.

Alternative solutions evaluated:
- **Retaining `expo-notifications` for Foreground Audio**: Cannot bypass denied notification permissions and inevitably couples audio delivery to OS notification presentation policies.
- **Adopting `expo-av`**: Deprecated in favor of `expo-audio` in modern Expo SDKs (SDK 58).
- **Adding `expo-haptics` for Foreground Vibration**: Adds an unnecessary native dependency when React Native's built-in `Vibration.vibrate(VIBRATION_PATTERN)` already provides deterministic cross-platform vibration patterns.
- **Adding a User Setting for iOS Silent Mode Bypass**: Introduces avoidable settings complexity; an open focus timer reaching `00:00` should ring reliably like an alarm.

## Decision

We decided to decouple foreground audio playback from OS notifications by introducing a dedicated audio service (`services/audioService.js` and `services/audioService.web.js`) and restricting `components/context/timerNotifications*.js` exclusively to background alarms and Android ongoing presence:

1. **Dedicated Native Audio Engine (`services/audioService.js` via `expo-audio`)**:
   - Exposes a unified 5-function contract shared identically across native and web: `prepareCycleSounds`, `playCycleSound`, `scheduleCycleAlarms`, `cancelCycleAlarms`, and `releaseCycleSounds`.
   - Configures the native audio session via `setAudioModeAsync` with:
     - `playsInSilentMode: true` so iOS plays completion tones even when the physical mute switch is enabled.
     - `interruptionMode: "mixWithOthers"` so cycle chimes mix smoothly over background music or podcasts without pausing them.
     - `allowsRecording: false` and `shouldPlayInBackground: false`.
   - Preloads `assets/sounds/focus.wav` and `assets/sounds/break.wav` via `createAudioPlayer` on play gesture (`prepareCycleSounds`), coalescing concurrent initialization and lazily preparing on demand if needed.
   - Plays `focus.wav` for focus cycles or whenever `distinctSounds === false` (preserving parity with Web without adding extra audio assets), and `break.wav` for break cycles when `distinctSounds === true`, rewinding via `seekTo(0)` before calling `play()`.
   - Operates with zero dependency on notification permissions and releases native players via `releaseCycleSounds()` when `TimerProvider` unmounts.

2. **Minimal Config Plugin Permissions (`app.json`)**:
   - Registers the `"expo-audio"` config plugin with `microphonePermission: false`, `recordAudioAndroid: false`, `enableBackgroundPlayback: false`, and `enableBackgroundRecording: false`, preserving Fokus's minimal-permission posture.

3. **Dedicated Web Audio Engine (`services/audioService.web.js`)**:
   - Migrates the entire Web Audio API synthesizer (`[659.25, 523.25]` for focus/default and `[523.25, 783.99, 1046.5]` for breaks with `distinctSounds: true`), audio-clock alarm scheduling (`scheduleCycleAlarms`), drift/sleep reconciliation (`setInterval` + `visibilitychange` + `statechange`), and cleanup (`cancelCycleAlarms`, `releaseCycleSounds`) from `timerNotifications.web.js`, degrading gracefully with `console.warn` when `AudioContext` is unavailable or fails.

4. **Background-Only OS Notifications & Foreground Suppression (`timerNotifications*.js`)**:
   - Removes `playCycleSound` and `prepareCycleSounds` from `components/context/timerNotifications.js` and `components/context/timerNotifications.web.js`. `timerNotifications.web.js` now retains only `VIBRATION_PATTERN`, ongoing constants, and no-op async stubs.
   - Updates `Notifications.setNotificationHandler` in `timerNotifications.js` to return `{ shouldShowBanner: false, shouldShowList: isOngoing, shouldPlaySound: false, shouldSetBadge: false }`, where `isOngoing` is `true` **only** when `Platform.OS === "android" && notification?.request?.identifier === ONGOING_NOTIFICATION_ID`. This eliminates foreground OS banners, sounds, and duplicate alerts while preserving Android's sticky status-bar progress indicator.
   - Keeps `scheduleTimerNotifications`, `cancelTimerNotifications`, `showOngoingNotification`, and `dismissOngoingNotification` dedicated to background alarms (`SCHEDULE_EXACT_ALARM` / `DATE` triggers) and Android ongoing presence.

5. **Unified In-App Foreground Vibration (`TimerProvider.jsx` & `timerLogic.js`)**:
   - Because OS notifications are silenced in foreground, `TimerProvider` triggers `Vibration.vibrate(VIBRATION_PATTERN)` directly across **Android, iOS, and Web** whenever `shouldVibrateInApp({ finishedSegments, now, settings, appActive })` returns `true` (`settings.vibrate && appActive && finishedSegments.some((s) => now - s.endTime <= FOREGROUND_ALERT_WINDOW_MS)`).
   - Removes the legacy `notificationsScheduledRef` tracker and the `Platform.OS !== "android"` vibration guard.
   - Gates both `playCycleSound` and `Vibration.vibrate` strictly on `AppState.currentState === "active"`, ensuring background completions remain solely handled by pre-scheduled OS notifications.

6. **Jest Testing & Mock Strategy**:
   - Provides a shared manual mock at `__mocks__/expo-audio.js` (`createAudioPlayer`, `setAudioModeAsync`, `createMockPlayer`) to isolate native audio APIs in tests.
   - Verifies native and web audio engines independently in `services/audioService.test.js` and `services/audioService.web.test.js`, while `components/context/TimerProvider.test.jsx` mocks `../../services/audioService` explicitly to validate orchestration across Play, Pause, mode switching, foreground completion, background silence, and unmount cleanup.

## Consequences

### Positive

- **Zero Dependence on Notification Permissions in Foreground**: Users who deny OS notification permissions still receive deterministic cycle completion audio and vibration whenever Fokus is open.
- **Clean Minimalist Foreground UX**: Suppressing foreground OS notifications eliminates intrusive banners/toasts over the timer interface while keeping Android's ongoing status-bar notification intact.
- **Predictable Audio Coexistence**: `playsInSilentMode: true` and `interruptionMode: "mixWithOthers"` ensure focus alerts are audible on iOS without interrupting the user's music or podcasts.
- **Clear Architectural Seams**: `services/audioService*` owns all foreground/web audio lifecycle concerns, while `components/context/timerNotifications*` owns strictly background OS notifications and ongoing status presence.
- **Consistent Cross-Platform Vibration**: Removing the Android exclusion and `notificationsScheduled` coupling unifies foreground vibration logic across Android, iOS, and Web.

### Negative

- **Additional Native Dependency**: Introduces `expo-audio` (`~58.0.12`), requiring a native prebuild/dev-client rebuild for physical device builds (mitigated by disabling microphone, recording, and background audio flags in `app.json`).
- **Dual-Path Alert Coordination**: Foreground alerts (`services/audioService` + `Vibration`) and background alerts (`expo-notifications`) are now distinct paths synchronized around `AppState.currentState === "active"` and `setNotificationHandler` suppression, requiring explicit regression coverage in `TimerProvider.test.jsx` and `timerNotifications.test.js`.
