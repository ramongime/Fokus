import { pomodoro } from "../../constants/pomodoro";
import { DEFAULT_SETTINGS, SETTINGS_LIMITS } from "../../constants/settings";

// Quantos ciclos à frente são planejados (e notificados) quando os ciclos emendam
export const MAX_PLANNED_SEGMENTS = 8;

const pad = (value) => String(value).padStart(2, "0");

const clamp = (value, { min, max }) => Math.min(max, Math.max(min, value));

export const todayKey = (now) => {
  const date = new Date(now);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const getTypeById = (id) =>
  pomodoro.find((p) => p.id === id) ?? pomodoro[0];

export const getDurationSeconds = (typeId, settings) =>
  settings.durations[typeId] * 60;

export const getRemainingSeconds = (endTime, now) =>
  Math.max(0, Math.ceil((endTime - now) / 1000));

// Depois de um foco vem pausa curta, ou longa a cada `longBreakInterval` focos.
// `focusCount` já inclui o foco que acabou de terminar.
export const getNextTypeId = (finishedTypeId, focusCount, settings) => {
  if (finishedTypeId !== "focus") {
    return "focus";
  }
  return focusCount % settings.longBreakInterval === 0 ? "long" : "short";
};

// Monta a sequência de ciclos a partir de agora. Sem emendar ciclos, é só o atual.
export const buildPlan = ({ typeId, seconds, now, focusCount, settings }) => {
  const segments = [{ typeId, endTime: now + seconds * 1000 }];
  if (!settings.autoStartCycles) {
    return segments;
  }

  let count = focusCount;
  while (segments.length < MAX_PLANNED_SEGMENTS) {
    const last = segments[segments.length - 1];
    if (last.typeId === "focus") {
      count += 1;
    }
    const nextTypeId = getNextTypeId(last.typeId, count, settings);
    segments.push({
      typeId: nextTypeId,
      endTime: last.endTime + getDurationSeconds(nextTypeId, settings) * 1000,
    });
  }
  return segments;
};

export const countFinishedSegments = (segments, now) =>
  segments.filter((s) => s.endTime <= now).length;

export const getTodayCount = (stats, now) =>
  stats.date === todayKey(now) ? stats.count : 0;

export const addFocusCompletions = (stats, amount, now) => ({
  date: todayKey(now),
  count: getTodayCount(stats, now) + amount,
});

export const getSegmentNotification = (segments, index, settings, task) => {
  const finished = getTypeById(segments[index].typeId);
  const next = segments[index + 1];
  const taskLine =
    finished.id === "focus" && task ? `Tarefa: ${task.description}. ` : "";

  if (!next) {
    return {
      title: finished.notification.title,
      body: taskLine + finished.notification.body,
    };
  }
  const nextType = getTypeById(next.typeId);
  const minutes = settings.durations[next.typeId];
  return {
    title: finished.notification.title,
    body: `${taskLine}${nextType.display} começou: ${minutes} min.`,
  };
};

// Completa com os padrões e corrige valores fora dos limites (ex.: dados antigos)
export const normalizeSettings = (saved = {}) => {
  const savedDurations = saved.durations ?? {};
  return {
    autoStartCycles:
      typeof saved.autoStartCycles === "boolean"
        ? saved.autoStartCycles
        : DEFAULT_SETTINGS.autoStartCycles,
    longBreakInterval: clamp(
      Number(saved.longBreakInterval) || DEFAULT_SETTINGS.longBreakInterval,
      SETTINGS_LIMITS.longBreakInterval,
    ),
    durations: Object.fromEntries(
      Object.keys(DEFAULT_SETTINGS.durations).map((id) => [
        id,
        clamp(
          Number(savedDurations[id]) || DEFAULT_SETTINGS.durations[id],
          SETTINGS_LIMITS.durations[id],
        ),
      ]),
    ),
  };
};

export const formatSeconds = (totalSeconds) =>
  `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
