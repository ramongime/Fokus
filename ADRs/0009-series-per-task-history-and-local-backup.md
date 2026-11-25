# 0009. Long-Break Series, Per-Task History and Local Backup

**Status**: Accepted  
**Date**: 2026-11-25  

## Context

Three gaps surfaced while fixing the daily counter:

1. The position in the long-break series ("Foco · 2 de 4") was derived from the daily counter, so a session running past midnight restarted at 1.
2. The history only stored totals per day, so there was no way to see time spent per task.
3. All data lived only on the device (local-first), with 90 days of history and no way to keep or move it.

## Decision

1. **Series independent from the day**: `fokus-timer` stores `series: { count, lastEndTime }`. `getSeriesCount` (pure, `timerLogic.js`) keeps the series across midnight when the last focus ended at most `SERIES_GAP_MS` (2 h) earlier; otherwise it restarts on the new day. Without a saved series (older data) it falls back to the daily counter. The daily counter (`todayCount`) still resets at local midnight.
2. **Per-task history**: each day entry may carry `tasks: { [taskId]: { count, minutes } }`, written when a focus finishes with a selected task. Older entries stay valid and are shown as "Sem tarefa".
3. **Retention**: `HISTORY_DAYS` goes from 90 to 365 (one small entry per day with focus).
4. **Backup without new native modules**: export builds a versioned JSON (`app: "fokus"`, `version: 1`) and shares it with React Native `Share` (download on web). Restore takes pasted text and runs it through the same normalizers used on load (`normalizeSettings`, `normalizeStoredTasks`, `normalizeHistory`), with a size cap and per-day caps. Settings are replaced; tasks and history are merged (`mergeTasks`, `mergeHistory` keeps the larger count per day) so restoring twice never double counts. The running timer is never part of a backup.

## Consequences

### Positive

- The long-break rhythm is preserved for late sessions.
- Users can see where their focus went and keep or move their data without any account or cloud.
- Imported data is treated as untrusted and bounded.

### Negative

- Restore by pasting text is less convenient than a file picker (`expo-document-picker` is a possible follow-up).
- A day entry is slightly larger when tasks are used.
