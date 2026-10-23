# CLAUDE.md

## Overview

Fokus is an offline-first, client-side Pomodoro timer and task management application built with React Native 0.88, React 19.3, Expo SDK 58, and Expo Router 58. The user interface is in Brazilian Portuguese (`pt-BR`). State management is composed via lightweight, ordered React Context providers backed by AsyncStorage and decoupled pure functional logic engines.

## Context Pointers

- **Architecture & System Workflows**: Consult [`CONTEXT.md`](CONTEXT.md) for detailed runtime boundaries, the target timestamp background timer mechanism, and persistence lifecycles.
- **Domain Language & Terms**: Consult [`GLOSSARY.md`](GLOSSARY.md) for ubiquitous domain definitions (Focus Cycles, Breaks, Streaks, Notification Channels) and avoided synonyms.
- **Architectural Decision Records**: Consult [`ADRs/`](ADRs/) (`0001` through `0005`) for trade-offs on background projection, pure logic decoupling, provider ordering, offline storage guards, and SPA web export.

## Repository Structure

```
app/                              # Expo Router file-based routing
  _layout.jsx                     # Root composition: Providers + GestureHandler + Drawer
  index.jsx                       # Welcome landing (redirects to /pomodoro once seen)
  pomodoro.jsx                    # Primary timer screen (active cycle, task link, daily count)
  history.jsx                     # 7-day visual chart, weekly totals, streaks
  settings.jsx                    # Phase durations, auto-advance, vibration preferences
  tasks/index.jsx                 # Task list with pomodoro completion counters
  add-task/index.jsx              # Task creation modal route (hidden from drawer)
  edit-task/[id].jsx              # Task edit modal route (hidden from drawer)
components/                       # Presentational UI components (prop-driven, zero context calls)
  Icons/index.jsx                 # SVG icon registry using react-native-svg
  context/                        # State providers and pure domain logic
    SettingsProvider.jsx          # Settings state + AsyncStorage ("fokus-settings")
    TaskProvider.jsx              # Task CRUD + AsyncStorage ("fokus-tasks")
    TimerProvider.jsx             # Timer state machine + AsyncStorage ("fokus-timer")
    timerLogic.js                 # Pure functions: plan generation, durations, phase progression
    historyLogic.js               # Pure functions: 90-day retention, streak calculation, week buckets
    timerNotifications.js         # Local native OS notification scheduler (expo-notifications)
constants/                        # Design tokens and static presets
  theme.js                        # Colors, typography scales, border radii
  settings.js                     # Default settings limits and presets
  pomodoro.js                     # Phase metadata (focus, short break, long break)
ADRs/                             # Architectural Decision Records (0001 - 0005)
Documentos/                       # Native iOS build and distribution walkthroughs
docs/                             # Static banner and screenshots for documentation
scripts/                          # Tooling scripts (e.g., screenshots.mjs)
```

## Non-Obvious Commands & Ports

```bash
# Metro development bundler (defaults to port 8081)
npx expo start

# Run unit tests via Jest (jest-expo preset, executes *.test.js files)
npm test

# Continuous test watcher
npm test -- --watchAll

# Validate code styling via ESLint 9 (flat configuration)
npm run lint

# Auto-format codebase with Prettier
npm run format

# Headless screenshot generation via Playwright (regenerates docs/assets)
# Requires one-time setup: npx playwright install chromium
npm run screenshots

# Build static Single Page Application web distribution
npx expo export -p web

# iOS native build verification
npx expo run:ios
```

## Architecture Guardrails

- **Ordered Provider Hierarchy**: The provider order in `app/_layout.jsx` is an invariant: `SettingsProvider` > `TasksProvider` > `TimerProvider`. Never invert or alter this tree; the Timer depends directly on upstream Settings for durations and Tasks for pomodoro increments.
- **Pure Functional Logic Engines**: All temporal math and sequence progression reside in `components/context/timerLogic.js` and `historyLogic.js`. Keep these modules 100% free of React hooks, system clocks (`Date.now()`), or I/O side effects. Always pass epoch timestamps as explicit parameters (`now`).
- **Presentational Decoupling**: Components in `components/` must remain pure presentational elements. Never import or call `useXContext` inside visual components; consume context exclusively at the route screen level (`app/`) and pass data/callbacks down via props.
- **Storage Mount Barrier**: Every AsyncStorage consumer must gate persistence writes behind an `isLoaded` boolean flag. Writing to storage before initial data hydration finishes will clobber persisted user data with initial default state.
- **Target Timestamp Projection**: Never implement interval countdowns via tick decrements (`remainingSeconds - 1`). Always project target deadlines (`endTime = now + duration`) and derive remaining time from `Date.now()` to survive mobile process suspension and device sleep.

## Environment Gotchas

- **Android Exact Alarms & Background Delivery**: Android 12+ requires `SCHEDULE_EXACT_ALARM` in `app.json` for timer notifications to trigger precisely when the phone is locked. Do not remove this permission.
- **Immutable Notification Channels**: Android notification channels cannot be altered after creation. Fokus maintains two distinct channels: `cycles` (vibration enabled) and `cycles-quiet` (silent). The deprecated channel `timer` is purged on application startup.
- **Web SPA Mode Requirement**: `app.json` enforces `web.output: "single"`. Do not change this to `"static"`; pre-rendered static HTML triggers React hydration mismatches with client-only AsyncStorage state.
- **Web SPA Shell**: `public/index.html` is the template for the single-page web export. It paints `colors.background` before the JS loads; keep the two in sync.
- **Web Single Bundle**: `asyncRoutes.web` is `false` in the `expo-router` plugin. SDK 58 would otherwise split routes into chunks fetched on first visit, breaking offline navigation.
- **Web Notifications**: `timerNotifications.web.js` replaces the native module in the browser (no local notifications on web). Keep its exports in sync with `timerNotifications.js`.
- **Node 24**: Expo SDK 58 requires Node 22.13+ (`.nvmrc` pins 24, matching CI). Run `nvm use` before `npm install`.
- **Async Test APIs**: React Native Testing Library 14 makes `render`, `renderHook`, `act` and `fireEvent` async. Always `await` them.
- **String Task Identifiers**: Task IDs must be strictly formatted and compared as strings (`Date.now().toString()`). Legacy numeric IDs are auto-coerced during hydration.
