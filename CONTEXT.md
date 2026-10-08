# CONTEXT.md

## 1. System Boundary & Purpose

Fokus is a focused, client-side Pomodoro timer and task management application designed for mobile (iOS, Android) and modern web browsers. The system solves the productivity problem of maintaining deep attention through structured work and rest intervals while completely eliminating distracting cloud overhead, authentication gates, and tracking telemetry.

The application operates under a strict **local-first, zero-backend architecture**:
- **Zero Remote Dependencies**: All state, settings, tasks, and historical session logs reside strictly in device storage.
- **Background Resilience**: Accurately tracks timer progression across device sleep, lock screens, and process suspensions without running battery-draining continuous background services.
- **Accessible & Tactile**: Uses native OS notification channels, exact alarms, and haptic feedback to signal phase transitions even when the screen is locked.
- **Autonomous Utility**: Operates deterministically without network access, third-party analytics, or external accounts.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FOKUS APPLICATION BOUNDARY                      │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                     Expo Router v4 Shell                       │   │
│   │    (Drawer Navigation: /pomodoro, /tasks, /history, /settings) │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                   │
│   ┌────────────────────────────────▼───────────────────────────────┐   │
│   │                   Ordered Provider Hierarchy                   │   │
│   │         SettingsProvider ──► TasksProvider ──► TimerProvider   │   │
│   └────────────────────────────────┬───────────────────────────────┘   │
│                                    │                                   │
│            ┌───────────────────────┴───────────────────────┐           │
│            ▼                                               ▼           │
│   ┌──────────────────────────────┐        ┌────────────────────────┐   │
│   │ Pure Functional Logic Engine │        │ Native Platform Bridge │   │
│   │  - timerLogic.js             │        │  - timerNotifications  │   │
│   │  - historyLogic.js           │        │  - expo-notifications  │   │
│   └──────────────┬───────────────┘        │  - expo-haptics / OS   │   │
│                  │                        └────────────┬───────────┘   │
│                  ▼                                     ▼               │
│   ┌──────────────────────────────┐        ┌────────────────────────┐   │
│   │  AsyncStorage Key-Value DB   │        │ Native Operating System│   │
│   │  - fokus-settings            │        │ (Android Channels &    │   │
│   │  - fokus-tasks               │        │  Exact Alarms / iOS    │   │
│   │  - fokus-timer               │        │  Local Notification Center)│
│   └──────────────────────────────┘        └────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Architectural Topology & Component Layers

The application is structured into four distinct, loosely coupled layers following deep module principles:

### 2.1 File-Based Routing & Shell (`app/`)
Powered by Expo Router v4 and React Navigation Drawer:
- `app/_layout.jsx`: Root layout configuring gesture handling, provider nesting, Drawer navigation options, and the global theme palette.
- `app/index.jsx`: Onboarding landing screen. Shown strictly until the user completes the first welcome interaction (`settings.hasSeenWelcome`); automatically redirects to `/pomodoro` on subsequent launches.
- `app/pomodoro.jsx`: Primary operational interface presenting the timer countdown, phase indicator (Focus, Short Break, Long Break), active task assignment, and daily focus counter.
- `app/tasks/index.jsx`: Task list displaying completed and pending tasks with pomodoro progress badges and status toggles.
- `app/add-task/index.jsx` & `app/edit-task/[id].jsx`: Modal-style task entry and modification forms. Hidden from the Drawer menu (`drawerItemStyle: { display: "none" }`) with custom back navigation (`BackButtonDrawer`).
- `app/history.jsx`: 7-day visual bar chart, weekly summaries, total focused hours, and daily streak counters.
- `app/settings.jsx`: Customization panel for focus, short break, and long break durations, continuous cycle chaining, and vibration preferences.

### 2.2 Visual Presentation Components (`components/`)
- Stateless and prop-driven presentation modules (`Button`, `Card`, `ConfirmModal`, `Header`, `Input`, `Timer`, `TaskItem`, etc.).
- Visual variations are parameterized strictly via boolean props (`outline`, `active`, `completed`).
- Design tokens are centrally sourced from `constants/theme.js` (`colors`, `fontSizes`, `radii`); arbitrary hex codes are prohibited in visual components.
- Components never consume React Context directly; screens receive context values through domain hooks and pass down props.

### 2.3 Pure Functional Logic Engines (`components/context/`)
All temporal mathematics, state derivations, and cycle planning logic are isolated in side-effect-free JavaScript modules:
- `timerLogic.js`: Pure functions for phase determination, duration calculation, end timestamp projection (`buildPlan`), segment counting, settings normalization, and notification copy generation.
- `historyLogic.js`: Pure functions for daily bucket aggregation, 90-day retention filtering, 7-day rolling window structuring, and consecutive day streak calculations.
- Because these engines receive the current timestamp (`now`) as an explicit parameter and perform zero I/O, 100% of domain transitions are verifiable in unit tests without mocking timers or system clocks.

### 2.4 Native Device Abstraction (`components/context/timerNotifications.js`)
- Interfaces with `expo-notifications` to schedule and cancel local OS alerts.
- Configures persistent Android notification channels with dedicated vibration and sound policies.
- Encapsulates OS permission checks and gracefully degrades functionality if notifications are rejected.

---

## 3. Ordered Provider Hierarchy & State Management

Fokus avoids heavyweight state libraries (such as Redux or MobX) in favor of domain-focused React Context Providers arranged in a strict dependency chain in `app/_layout.jsx`:

```jsx
<SettingsProvider>
  <TasksProvider>
    <TimerProvider>
      <GestureHandlerRootView>
        <Drawer>
          {/* Screens */}
        </Drawer>
      </GestureHandlerRootView>
    </TimerProvider>
  </TasksProvider>
</SettingsProvider>
```

### 3.1 Strict Dependency Invariant
1. **`SettingsProvider` (Root)**:
   - Manages user preferences: `durations` (focus, short break, long break in minutes), `autoStartCycles` (continuous chaining), `longBreakInterval` (number of focus cycles before a long break), `vibrate`, and `hasSeenWelcome`.
   - Has zero domain dependencies.
2. **`TasksProvider` (Intermediate)**:
   - Manages the task collection: `tasks`, `addTask`, `editTask`, `deleteTask`, `toggleTaskCompleted`, `addPomodorosToTask`.
   - Depends only on its isolated persistence partition.
3. **`TimerProvider` (Leaf Consumer)**:
   - Consumes `settings` from `SettingsProvider` to determine duration lengths and cycle chaining rules.
   - Consumes `tasks` and `addPomodorosToTask` from `TasksProvider` to associate focus intervals with tasks and increment task completion tallies upon cycle finalization.
   - Exposes timer state machine hooks, current segment timers, live second counters, and 90-day rolling history.

### 3.2 Context Safety Guarantees
Each provider exports a companion hook (`useSettingsContext`, `useTaskContext`, `useTimerContext`). Each hook executes an invariant validation check and throws an explicit error if invoked outside its respective provider tree, preventing silent undefined state failures.

---

## 4. Core Domain Lifecycles & Background Timer Engine

### 4.1 The Background Timer Problem
On mobile operating systems (iOS and Android), background execution of JavaScript is suspended or heavily throttled seconds after the screen turns off or the application is sent to the background. Traditional `setInterval` or `setTimeout` decrement loops cease executing, causing timers to lose minutes or completely pause while the phone is locked.

### 4.2 Solution: Target Timestamp Projection (`endTime`)
Fokus replaces incremental countdown decrements with **target timestamp projection**:
1. When the user initiates a session, `buildPlan` calculates an absolute epoch millisecond deadline:
   $$\text{endTime} = \text{now} + (\text{remainingSeconds} \times 1000)$$
2. When continuous cycles ("Emendar ciclos") is active, `buildPlan` projects up to `MAX_PLANNED_SEGMENTS = 8` consecutive focus and break intervals ahead of time:
   $$\text{segments} = [\;\{ \text{typeId: "focus"}, \text{startTime}, \text{endTime} \},\; \{ \text{typeId: "short"}, \text{startTime}, \text{endTime} \},\; \dots \;]$$
3. Remaining display time is always derived functionally on every frame or tick:
   $$\text{remainingSeconds} = \max(0, \lceil(\text{endTime} - \text{Date.now()}) / 1000\rceil)$$
4. **Resumption Reconciliation**: When the application re-enters the foreground (`AppState.addEventListener("change")`), `countFinishedSegments` evaluates how many planned segments elapsed during the suspension window:
   - Completed focus intervals are credited to the active task and added to the 90-day history.
   - The UI immediately snaps to the currently active segment and remaining second count.
   - Dual-counting is prevented by maintaining a synchronized `processedRef` and `processed` state counter.

```
USER ACTION: Play
     │
     ▼
buildPlan() ─────────────────────────────► [Segment 1: Focus, endTime=T1]
     │                                      [Segment 2: Short Break, endTime=T2]
     │                                      [Segment 3: Focus, endTime=T3] ...
     ▼
scheduleTimerNotifications() ────────────► OS Notification Center
     │                                      (Alarm at T1, T2, T3)
     │
     ▼ (User locks device / JS suspended)
     │
     ▼
Native OS Alarm Fires at T1 ─────────────► Native Sound + Vibration Alert
     │                                      ("Foco concluído. Pausa começou!")
     ▼
User unlocks device (AppState Resume)
     │
     ▼
countFinishedSegments(now) ──────────────► Reconciles elapsed segments
     │                                      - Credits task pomodoro tally
     │                                      - Updates history[today]
     ▼
Live UI syncs to Segment 2 countdown
```

### 4.3 90-Day Rolling Analytics Lifecycle
1. Session records are committed to `history` upon focus completion using the local date string (`YYYY-MM-DD`).
2. If a focus session crosses midnight, it is credited to the day of completion (`endTime`).
3. During every focus append operation (`addFocusSessions`), historical keys older than 90 calendar days ($90 \times 24\text{ hours}$) are automatically pruned, keeping storage payloads compact and fast to parse.
4. `getStreak` calculates uninterrupted consecutive days of completed focus. To prevent streak anxiety, if today has no focus sessions yet, the calculation measures consecutive days starting from yesterday.

---

## 5. Data Persistence & Storage Boundaries

### 5.1 Storage Schema
Persistence is managed via `@react-native-async-storage/async-storage` using dedicated, non-overlapping partition keys:

| Storage Key | Managed Data Structure | Invariant / Defaults |
|---|---|---|
| `"fokus-settings"` | `{ autoStartCycles, vibrate, hasSeenWelcome, longBreakInterval, durations: { focus, short, long } }` | Clamped to `SETTINGS_LIMITS` (focus: 1-90 min, short: 1-30 min, long: 1-60 min). |
| `"fokus-tasks"` | Array of Task objects: `[{ id: string, description: string, pomodoros: number, estimatedPomodoros: number, completed: boolean }]` | IDs are strictly strings. Auto-migrates legacy numeric IDs. |
| `"fokus-timer"` | `{ segments, pausedSeconds, history: { [date: string]: { count, minutes } }, currentTaskId }` | Retains active segment queue and 90-day focus analytics. |

### 5.2 The `isLoaded` Mount Guard Pattern
AsyncStorage read operations are asynchronous. If a React component initializes state with default values and writes state back to storage upon mutation, a race condition occurs on mount: default state can overwrite existing persisted storage before the initial read resolves.

To guarantee storage integrity:
- Every provider introduces an `isLoaded` boolean state flag, initialized to `false`.
- Storage writing `useEffect` hooks are gated behind `if (!isLoaded) return;`.
- In `TimerProvider`, timer ticks and segment completions are held until `isLoaded && settingsLoaded && tasksLoaded` are all `true`, ensuring task counters are never written against an unhydrated task list.

### 5.3 Schema Migration & Resilience
Fokus provides defensive parsing and forward-compatible migration:
1. **Task ID Coercion**: Legacy versions generated numeric IDs (`Date.now()`). The task loader maps all legacy IDs via `String(t.id)` to guarantee consistent `===` string matching across route params.
2. **Legacy Stats Migration**: Earlier iterations maintained single-day counters (`stats: { date, count }`). On startup, `historyFromLegacyStats` converts legacy stats into the multi-day schema `{ [date]: { count, minutes: count * focusMinutes } }` without data loss.
3. **Settings Normalization**: Stored settings are passed through `normalizeSettings()`, filling in any missing keys from `DEFAULT_SETTINGS` and bounding numbers using `SETTINGS_LIMITS`.

---

## 6. External Integrations & Native Security Model

### 6.1 Native OS Notification Channels (Android)
Android requires explicit notification channels to govern alert behavior. Because channel sound and vibration parameters cannot be modified once created, Fokus registers two distinct channels:
- Channel `cycles` (`"Fim do ciclo"`): High importance, default sound, vibration pattern `[0, 400, 200, 400]`.
- Channel `cycles-quiet` (`"Fim do ciclo (sem vibrar)"`): High importance, default sound, zero vibration.
- Deprecated channels (`LEGACY_CHANNEL_ID = "timer"`) are deleted asynchronously during permission setup.

### 6.2 Android Permissions & Alarm Precision
- `SCHEDULE_EXACT_ALARM`: Declared in `app.json` to allow Android 12+ to trigger local notifications at exact segment end timestamps rather than in delayed power-saving battery batches.
- `VIBRATE`: Declared for physical haptic notification delivery.
- Unnecessary permissions (such as `SYSTEM_ALERT_WINDOW` or external storage access) are explicitly blocked in `android.blockedPermissions`.

### 6.3 Haptic & Vibration In-App Fallback
When the application is in the foreground, or when running in web environments where native notifications are unavailable, `shouldVibrateInApp` evaluates whether the app should trigger `Vibration.vibrate()`. To prevent unexpected buzzing when users open the app hours after a timer expired, vibration is strictly limited to an active window of 5,000 milliseconds (`VIBRATION_WINDOW_MS`) following segment completion.

### 6.4 Security & Privacy Architecture
- **Zero Network Transmission**: The application makes no outbound HTTP/HTTPS requests.
- **Zero Authentication**: No usernames, passwords, or personal data collected.
- **Offline Isolation**: All user tasks and habit patterns remain entirely on the local device.

---

## 7. Development, Tooling & Verification Workflows

### 7.1 Environment Prerequisites
- Node.js: >= 20.x
- Package Manager: npm (configured with lockfile `package-lock.json`)
- Expo CLI: Expo SDK 52 / React Native 0.76.6

### 7.2 Core Commands
```bash
# Install dependencies
npm install

# Start development bundler (Expo Go, simulator, or browser)
npx expo start

# Run unit test suite (Jest + jest-expo preset)
npm test

# Run tests in continuous watch mode
npm run test:watch

# Execute code style validation (ESLint 9 flat config)
npm run lint

# Automatically format code according to Prettier standards
npm run format

# Regenerate automated screenshots and documentation assets (Playwright)
npm run screenshots

# Native build preparation
npx expo prebuild
```

### 7.3 Web Single-Page Application (SPA) Export
In `app.json`, the web export target is configured as:
```json
"web": {
  "output": "single"
}
```
Setting `web.output: "single"` ensures the build generates a standard client-side SPA. Static pre-rendering (`"static"`) is deliberately rejected because server-side pre-rendering produces hydration mismatches when evaluating client-only AsyncStorage data.
