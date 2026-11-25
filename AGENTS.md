# AGENTS.md

Fokus is an offline-first Pomodoro timer and task manager built with React Native, Expo, and Expo Router (UI in `pt-BR`). Inspect `package.json` for dependencies, versions, and scripts.

## Context Pointers

- **Architecture, storage schema & runtime boundaries**: Read [`CONTEXT.md`](CONTEXT.md) before changing providers, persistence, or background timer behavior.
- **Domain vocabulary (`pt-BR`)**: Read [`GLOSSARY.md`](GLOSSARY.md) when naming cycles, tasks, stats, or alerts.
- **Architectural decisions**: Read [`ADRs/`](ADRs/) (`0001`–`0008`; note this repo uses `ADRs/` rather than `docs/adr/`).
- **Planned initiatives**: Read [`ROADMAP.md`](ROADMAP.md) before altering foreground audio or adding native Live Activities.
- **UI & testing standards**: Read [`.agents/rules/fokus-standards.md`](.agents/rules/fokus-standards.md) when editing UI components or tests.

## Architecture & Domain Invariants

- **Provider order**: Keep `SettingsProvider` > `TasksProvider` > `TimerProvider` in `app/_layout.jsx` so timer state always reads loaded settings and tasks.
- **Pure logic engines**: Keep `components/context/timerLogic.js` and `historyLogic.js` pure functions that accept `now` explicitly as a parameter, free of React hooks, `Date.now()`, or I/O.
- **Presentational components**: Consume context hooks (`use*Context`) in route screens (`app/`) and `widgets/WidgetSync.jsx`, passing data and callbacks to `components/` via props.
- **Storage mount barrier**: Gate every `AsyncStorage` write effect behind `isLoaded` (and gate `TimerProvider` ticks behind `isLoaded && settingsLoaded && tasksLoaded`).
- **Target timestamp projection**: Compute remaining time as `endTime - Date.now()` from planned segment deadlines rather than tick-decrement counters.
- **Desktop viewport bounds**: Constrain screen containers and modal sheets on web to `maxWidth: 380`–`520` centered horizontally.
- **String task IDs**: Format and compare task IDs strictly as strings (`Date.now().toString()`), coercing legacy numeric IDs on load.

## Environment Gotchas

- **Node 22.13+ (`24` in `.nvmrc`)**: Non-interactive shells may default to Node 20. Prefix `PATH` with the Node 24 binary (e.g., `export PATH="$HOME/.nvm/versions/node/v24.21.0/bin:$PATH"`) or run `nvm use` before `npx expo` / `npm ci`.
- **Android exact alarms**: Preserve `SCHEDULE_EXACT_ALARM` in `app.json` for locked-screen alarm precision on Android 12+.
- **Immutable Android notification channels**: Create new channel IDs when changing sound or vibration policies; `timer` is purged on startup.
- **Web SPA shell & bundle**: Keep `web.output: "single"` and `asyncRoutes.web: false` in `app.json`, and keep `public/index.html` background color synced with `colors.background` (`constants/theme.js`).
- **Web audio & notification parity**: Keep the 5 exported signatures in `services/audioService.web.js` (`prepareCycleSounds`, `playCycleSound`, `scheduleCycleAlarms`, `cancelCycleAlarms`, `releaseCycleSounds`) synchronized with `services/audioService.js`, and keep notification stubs/constants in `components/context/timerNotifications.web.js` synchronized with `components/context/timerNotifications.js`.
- **Screenshots script**: `npm run screenshots` requires one-time `npx playwright install chromium` and outputs to `docs/screenshots/` and `docs/banner.png`.

## Execution Efficiency

- Batch independent file reads, searches, and edits in parallel within the same turn.
- Chain checks into a single command (`lint && typecheck && test`), scoping to affected test files and quiet reporters (`--silent`, `--reporter=dot`) so output surfaces only failures.
- Delegate broad codebase exploration to the `research` subagent to keep the main context lean.
