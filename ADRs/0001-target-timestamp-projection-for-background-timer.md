# 0001. Target Timestamp Projection for Background Timer

**Status**: Accepted  
**Date**: 2026-10-08  

## Context

On mobile operating systems (iOS and Android), background execution of JavaScript is aggressively throttled or suspended within seconds after the display turns off or the application enters the background. 

In a Pomodoro productivity application, a conventional timer architecture relies on an interval loop (`setInterval` or `setTimeout`) that fires every 1,000 milliseconds to decrement a mutable `remainingSeconds` state variable. In mobile environments, this naive implementation fails completely:
1. When the user locks the phone, the JavaScript engine halts, causing the timer to freeze in place.
2. When the user unlocks the phone 25 minutes later, the timer shows only a few seconds elapsed.
3. Audio, vibration, and visual completion alerts fail to fire at the scheduled end of the focus block.

Alternative solutions were evaluated:
- **Continuous Background Tasks (`expo-task-manager` / Headless JS)**: Requires ongoing background service execution. This rapidly exhausts battery life, triggers OS memory killer terminations under Android's Doze mode, and incurs scrutiny during app store review.
- **Silent Audio Looping**: Playing inaudible sound in an audio session to keep the app active in the background. Highly battery-inefficient and prone to abrupt termination by the OS media manager.

## Decision

We decided to replace incremental tick-decrement state with **target timestamp projection**:

1. **Target Epoch Deadlines**: When a session is initiated, rather than storing a countdown, the engine calculates an absolute epoch millisecond deadline:
   $$\text{endTime} = \text{now} + (\text{seconds} \times 1000)$$
2. **Continuous Multi-Cycle Projection**: When continuous cycles ("Emendar ciclos") is enabled, `buildPlan` generates a sequence of up to 8 future segments (`MAX_PLANNED_SEGMENTS = 8`), projecting explicit `startTime` and `endTime` values for alternating focus and break blocks.
3. **Derived Display Time**: The UI derives the remaining display time functionally on every rendering tick:
   $$\text{remainingSeconds} = \max(0, \lceil(\text{endTime} - \text{Date.now()}) / 1000\rceil)$$
4. **Native Local Scheduled Notifications**: The application delegates alert delivery to the host operating system by scheduling local notifications via `expo-notifications` (`SCHEDULE_EXACT_ALARM` on Android) matching each segment's exact `endTime`. The OS handles firing the alert, sound, and vibration while the phone is locked and JavaScript is suspended.
5. **AppState Foreground Reconciliation**: When the app transitions back to the active state (`AppState` change event), `countFinishedSegments` compares the current `Date.now()` against the segment list. It deterministically credits completed focus intervals to the active task and rolling history, and snaps the countdown to the current live segment without tick drift.

## Consequences

### Positive
- **Guaranteed Temporal Accuracy**: The timer cannot lose time or drift due to CPU throttling, device sleep, or backgrounding.
- **Zero Battery Consumption**: No background JavaScript processes or background service workers remain active while the device is locked.
- **Reliable Hardware Alerts**: Native local notifications deliver sound and vibration even when the operating system has frozen the application process.
- **Immediate Recovery**: Reopening the app immediately reflects true real-world elapsed time.

### Negative
- **Notification Lifecycle Synchronization**: Any state mutation that alters timer flow (pausing, resetting, skipping, or switching modes) must explicitly call `cancelTimerNotifications` and re-schedule alerts.
- **Bounded Projection**: Multi-cycle projections must be capped at 8 segments (`MAX_PLANNED_SEGMENTS`) to prevent exceeding platform notification scheduling limits (e.g., iOS limits apps to 64 scheduled local notifications).
