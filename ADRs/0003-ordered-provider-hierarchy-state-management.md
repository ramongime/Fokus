# 0003. Ordered Provider Hierarchy for State Management

**Status**: Accepted  
**Date**: 2026-10-08  

## Context

Fokus requires shared state across three distinct functional domains:
1. **Settings**: User preferences (phase durations, continuous cycle toggles, vibration, and onboarding status).
2. **Tasks**: Task entity CRUD, status toggling, and pomodoro completion counts.
3. **Timer**: Active segment queue, countdown ticking, session completions, and 90-day history.

These domains exhibit clear directional dependencies:
- The Timer must read current duration settings and auto-advance configurations from Settings.
- The Timer must increment the pomodoro count of the currently active Task upon focus completion.
- Settings and Tasks have no dependency on the live Timer state.

We considered three state management architectures:
- **Global External State Store (Redux / Zustand)**: Adds external runtime dependencies, boilerplate actions/selectors, and increases bundle size for a standalone utility application.
- **Monolithic Context (`AppContext`)**: Consolidating all state into a single provider triggers widespread component re-renders across the entire screen hierarchy on every 1-second timer tick.
- **Independent Sibling Contexts**: Placing providers as siblings requires an external imperative event bus or ref coordination for the Timer to notify Tasks of completed sessions.

## Decision

We decided to structure state management using domain-scoped React Context Providers arranged in an explicit, unidirectional hierarchy in `app/_layout.jsx`:

```jsx
<SettingsProvider>
  <TasksProvider>
    <TimerProvider>
      <GestureHandlerRootView>
        <Drawer>
          {/* Screen Routes */}
        </Drawer>
      </GestureHandlerRootView>
    </TimerProvider>
  </TasksProvider>
</SettingsProvider>
```

### Key Architectural Rules

1. **Unidirectional Hierarchy**:
   - `SettingsProvider` sits at the root with zero domain dependencies.
   - `TasksProvider` sits in the middle, managing task CRUD and persistence.
   - `TimerProvider` sits at the leaf position, consuming `useSettingsContext()` (for durations and auto-advance rules) and `useTaskContext()` (for `addPomodorosToTask` and `tasks`).
2. **Fail-Fast Context Access Invariants**:
   Every provider exports a dedicated consumer hook (`useSettingsContext`, `useTaskContext`, `useTimerContext`). Each hook verifies that the context value is defined and throws an explicit error if invoked outside its respective provider tree:
   ```javascript
   export default function useTimerContext() {
     const context = useContext(TimerContext);
     if (!context) {
       throw new Error("useTimerContext must be used within a TimerProvider");
     }
     return context;
   }
   ```
3. **Strict Separation of Screens and Visual Components**:
   Presentational UI components in `components/` are strictly forbidden from consuming context hooks directly. Context is consumed exclusively at the screen level (`app/`), and state/callbacks are passed down via standard props.

## Consequences

### Positive
- **Zero Third-Party State Dependencies**: Uses native React primitives without additional npm packages or state boilerplate.
- **Granular Re-render Isolation**: Active 1Hz countdown ticks in `TimerProvider` only re-render components consuming `useTimerContext`; screens viewing task lists or settings are unaffected by timer ticks.
- **Deterministic Domain Composition**: The timer can directly invoke `addPomodorosToTask(currentTaskId, count)` within its lifecycle handlers without requiring asynchronous event brokers.

### Negative
- **Strict Nesting Requirement**: The provider order in `app/_layout.jsx` is an invariant. Reordering providers (e.g., placing `TimerProvider` above `TasksProvider`) will crash the application on launch.
- **Context Boundary Propagation**: Refactoring or adding a new cross-domain feature requires careful consideration of where the provider belongs in the hierarchy.
