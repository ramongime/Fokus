# 0002. Decoupled Pure Timer Logic Engine

**Status**: Accepted  
**Date**: 2026-10-08  

## Context

In timer-driven user interfaces, domain business rules (cycle progression, break alternation, segment scheduling, streak calculation, settings validation) are commonly intertwined directly within React component hooks (`useEffect`, `useState`), interval handlers, and platform storage calls.

When business logic is conflated with UI component lifecycles, critical architectural problems arise:
1. **Flaky & Fragile Testing**: Verifying that a long break triggers after every $N$ focus sessions requires mounting React component trees, configuring Jest fake timers (`jest.useFakeTimers()`), and asserting on rendered text.
2. **Stale Closures & Render Race Conditions**: Interval ticks and asynchronous storage callbacks frequently read stale state, causing double-incremented cycles or skipped breaks.
3. **Temporal Indeterminism**: Direct calls to `Date.now()` or `new Date()` inside domain algorithms prevent deterministic reproduction of edge cases (such as midnight rollouts, daylight saving transitions, or streak evaluations when a user opens the app in the morning).

## Decision

We decided to isolate all temporal arithmetic, plan generation, and analytical aggregations into pure functional modules: `timerLogic.js` and `historyLogic.js`.

The implementation adheres to four architectural rules:

1. **Zero Platform or Framework Imports**: The logic modules import zero dependencies from React, React Native, Expo, or AsyncStorage. They depend only on static configuration constants (`constants/pomodoro.js`, `constants/settings.js`).
2. **Explicit Clock Injection**: Functions never read the system clock internally. The current epoch timestamp (`now`) is always provided as an explicit parameter by the caller:
   ```javascript
   export const getRemainingSeconds = (endTime, now) =>
     Math.max(0, Math.ceil((endTime - now) / 1000));
   
   export const buildPlan = ({ typeId, seconds, now, focusCount, settings }) => { ... };
   ```
3. **Pure Immutable Transformations**: Functions accept input data and return newly calculated records or arrays without mutating arguments:
   - `getNextTypeId(finishedTypeId, focusCount, settings)` deterministically returns `"long"`, `"short"`, or `"focus"`.
   - `addFocusSessions(history, sessions, now)` returns a new history object retaining only the last 90 calendar days.
   - `getStreak(history, now)` calculates consecutive daily streaks, dynamically offsetting to yesterday if today has no logged focus yet.
4. **Isolated Unit Test Coverage**: Pure functions are verified directly in `timerLogic.test.js` and `historyLogic.test.js` using Jest. Testing complex multi-cycle sequences and calendar edge cases requires zero mocking or timer manipulation.

## Consequences

### Positive
- **Deterministic Verification**: Every mathematical calculation, segment progression, and analytical streak derivation is verifiable in standard unit tests running in under a second.
- **Deep Module Architecture**: React Context Providers become thin orchestration adapters, simply wiring user actions and system events to deep, well-tested functional engines.
- **Platform Portability**: The pure logic engines can be utilized across mobile, web, CLI utilities, or alternate rendering targets without changing a single line of business code.
- **Zero Race Conditions**: Eliminating internal state and clock side effects prevents stale closure bugs during rapid component re-renders.

### Negative
- **Parameter Threading**: Calling functions requires React providers to explicitly capture `Date.now()` and pass current settings, segment lists, and counters on every invocation.
