# 0007. Timer Background Presence and Completion Alarms

**Status**: Accepted  
**Date**: 2026-11-12  

## Context

Mobile operating systems (iOS and Android) aggressively throttle or freeze background CPU execution within seconds after the display turns off or the application enters the background. 

In a Pomodoro productivity application, users frequently lock their devices or switch to other applications while a focus or break session is active. Two critical user experience challenges arise:

1. **Glanceable Background Presence**:
   Users need to check how much time remains without unlocking their device or opening the app.
   - On **Android**, keeping users informed without active user interaction typically relies on an ongoing status bar notification.
   - On **iOS**, real-time lock screen and Dynamic Island visibility relies on Live Activities (`NSSupportsLiveActivities`).
   - Maintaining continuous background execution via long-running workers (`expo-task-manager` / Headless JS) or interval polling rapidly exhausts battery life and triggers aggressive termination by Android Doze mode or iOS background execution limits.

2. **Unified Cycle Completion Alarms**:
   When the timer countdown reaches `00:00`, completion feedback (sound and haptic vibration) must trigger deterministically across all environments:
   - In **Foreground** (app active and visible): The app must never stay silent when open in front of the user (`.agents/rules/fokus-standards.md`).
   - In **Background** (screen locked or app suspended): The host operating system must fire native alerts without depending on a frozen JavaScript runtime.

Alternative solutions evaluated:
- **Continuous Foreground Service with WakeLocks (Android)**: Keeping a persistent notification with a continuous CPU wake lock and running JS intervals drains battery quickly, clutters device performance, and risks app store rejection.
- **Silent Background Audio Looping**: Playing inaudible audio to keep the audio session open in the background is battery-inefficient and terminated by platform media managers.
- **Separate Uncoordinated Notification Mechanisms**: Dispatching distinct, uncoordinated notification events for foreground and background created inconsistent audio channels and sound mismatches.

## Decision

We decided to establish unified background presence and completion alerting using target timestamp projection and native notification channel orchestration in `components/context/timerNotifications.js`:

1. **Target Timestamp Ongoing Presence (Android & iOS)**:
   - Instead of streaming incremental seconds across native bridges every second, background presence is established using the absolute target deadline (`endTime`).
   - **Android Ongoing Notification**: The function `showOngoingNotification({ typeLabel, endTime })` posts a sticky notification (`sticky: true`, `priority: "low"`, `importance: LOW`, `channelId: "timer-active"`, `ONGOING_NOTIFICATION_ID = "fokus-timer-ongoing"`) displaying the active phase label and formatted estimated completion time (`Término previsto às HH:MM`). This notification is silent and non-vibrating to avoid distracting the user during deep focus.
   - **iOS Live Activities**: The application configures `NSSupportsLiveActivities: true` in `app.json` (`ios.infoPlist`), enabling target timestamp binding for native Live Activities and Dynamic Island projections.

2. **Unified Cycle Completion Alarms**:
   - **Foreground Delivery**: When the timer countdown reaches `00:00` while the application is in the foreground, `playCycleSound(typeId, { distinctSounds, vibrate })` fires immediately. It schedules an immediate local notification with phase-specific audio assets (`focus.wav` or `pause.wav`) and vibration pattern (`VIBRATION_PATTERN = [0, 400, 200, 400]`), ensuring immediate audiovisual and haptic feedback.
   - **Background Delivery**: When starting or modifying a timer sequence, `scheduleTimerNotifications` pre-registers exact native alarms (`SCHEDULE_EXACT_ALARM` on Android, `SchedulableTriggerInputTypes.DATE` on iOS) for each segment's target `endTime`. Even when the JS runtime is frozen, the OS delivers the notification, custom sound, and vibration at the exact target millisecond.

3. **Lifecycle Teardown & Transition Hygiene**:
   - Whenever the timer completes, pauses, resets, skips, or switches modes, `dismissOngoingNotification()` immediately revokes the ongoing status notification via `Notifications.dismissNotificationAsync(ONGOING_NOTIFICATION_ID)`.
   - Upon cycle completion, the timer cleanly advances to the next suggested phase (e.g., Short Break following Focus) and rests in a paused state until explicitly started by the user or auto-advanced by user settings.

## Consequences

### Positive

- **Zero Continuous Battery Drain**: The application achieves persistent status bar presence without background polling, headless JS intervals, or battery-draining CPU wake-locks.
- **Glanceable Status**: Users can glance at the Android status bar and notification drawer to see the current phase and projected completion time.
- **Consistent Audio-Visual Feedback**: Alarms fire reliably across mobile platforms at `00:00`, upholding the core tenet that Fokus never finishes silently.
- **Clean Notification Tray**: Dismissing the ongoing notification upon pause, reset, or cycle end ensures zero leftover stale notifications.

### Negative

- **Foreground Notification Coupling**: Because `playCycleSound` currently routes through `expo-notifications`, foreground audio depends on notification permissions and OS notification settings. If notification permissions are denied, foreground sounds are also blocked (an architectural opportunity documented in `ROADMAP.md` for decoupling via a dedicated native audio engine such as `expo-audio`).
  - *Update (2026-11)*: mitigated. When permission is denied and the app is active, `playCycleSound` falls back to `playInAppCycleSound`, which plays `focus.wav`/`pause.wav` through `expo-audio` (`playsInSilentMode: true`) and vibrates on Android. With permission granted the notification path is unchanged.
- **Android Channel Immutability**: Modifying notification sound or vibration behavior requires creating new channel identifiers (`cycles-focus-vibrate`, `cycles-break-quiet`) and migrating legacy channels (`deleteNotificationChannelAsync`).
