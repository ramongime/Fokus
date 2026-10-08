# 0004. Offline-First AsyncStorage with Schema Migration

**Status**: Accepted  
**Date**: 2026-10-08  

## Context

Fokus operates strictly offline with zero remote database synchronization. All application state is stored locally on the device using `@react-native-async-storage/async-storage`.

In a client-only key-value storage model lacking an integrated database migration framework (such as Flyway or SQLite migrations), two critical failure modes threaten data integrity:

1. **Mount-Time Race Condition (Accidental Data Wipes)**:
   React component state initializes synchronously with empty default values (`tasks = []`, `settings = DEFAULT_SETTINGS`). Reading from AsyncStorage is an asynchronous operation. If an auto-persisting `useEffect` triggers on initial state updates before `AsyncStorage.getItem()` resolves, the empty default state serializes to storage, irreversibly destroying the user's tasks, settings, and historical statistics.
2. **Schema Drift Across Application Updates**:
   As features evolved across releases:
   - Task identifiers changed from numeric timestamps (`1728420000000`) to string tokens (`"1728420000000"`). Comparing route params from Expo Router (strings) against numeric task IDs caused strict equality checks (`===`) to fail, preventing task editing.
   - Session tracking transitioned from a single-day volatile counter (`stats: { date, count }`) to a rolling 90-day analytical map (`history: { [date]: { count, minutes } }`).
   - Newly introduced settings keys could be missing from stored JSON, or legacy values could exceed UI layout bounds.

## Decision

We adopted an offline-first storage pattern combining the **`isLoaded` mount guard** with **defensive, forward-compatible schema normalization**:

### 1. The `isLoaded` Mount Guard Pattern
Every context provider implements an `isLoaded` boolean guard:
```javascript
const [isLoaded, setIsLoaded] = useState(false);

// Initial asynchronous load
useEffect(() => {
  const loadData = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) setState(migrateAndNormalize(JSON.parse(data)));
    } finally {
      setIsLoaded(true);
    }
  };
  loadData();
}, []);

// Gated persistence write
useEffect(() => {
  if (!isLoaded) return; // Barrier prevents overwriting storage with default state
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}, [state, isLoaded]);
```

Furthermore, in `TimerProvider`, completing cycles and writing to the task list is held behind a composite readiness gate:
```javascript
const ready = isLoaded && settingsLoaded && tasksLoaded;
```
This guarantees that focus cycle increments are never credited against an unhydrated task list.

### 2. Autonomous Migration & Normalization Pipelines
- **Task ID Coercion**: On load, `TaskProvider` maps all stored tasks through `String(t.id)` to guarantee compatibility with Expo Router route parameters:
  ```javascript
  const sanitized = parsed.map((task) => ({ ...task, id: String(task.id) }));
  ```
- **Historical Stats Migration**: `historyFromLegacyStats` converts legacy single-day objects into the multi-day schema on first boot without data loss:
  ```javascript
  export const historyFromLegacyStats = (stats, focusMinutes) =>
    stats?.date && stats.count > 0
      ? { [stats.date]: { count: stats.count, minutes: stats.count * focusMinutes } }
      : {};
  ```
- **Settings Normalization**: Stored settings are filtered through `normalizeSettings()`, which clamps duration values within `SETTINGS_LIMITS` and injects default fallbacks for missing keys.

## Consequences

### Positive
- **Guaranteed Storage Integrity**: Mount-time overwrites of persisted user data are structurally impossible.
- **Seamless Application Upgrades**: Users upgrading from legacy versions retain their tasks and completion counts without manual data export or migration prompts.
- **Defensive Resilience**: Corrupt or malformed storage payloads gracefully fall back to bounded default values instead of crashing the interface.

### Negative
- **Boilerplate in Providers**: Each context provider must independently manage `isLoaded` lifecycle flags and guarded write effects.
- **Maintenance Overhead**: Schema modifications require updating normalization functions and preserving compatibility parsers for legacy schemas.
