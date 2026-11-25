/*
 * Regras do timer em funções puras: recebem dados e devolvem um resultado, sem ler
 * o relógio nem salvar nada. Por isso dá para testar tudo em timerLogic.test.js.
 * O `now` (horário atual em ms) sempre vem de quem chama.
 */
import { pomodoro } from "../../constants/pomodoro";
import { DEFAULT_SETTINGS, SETTINGS_LIMITS } from "../../constants/settings";
import { todayKey } from "./historyLogic";

// Quantos ciclos à frente são planejados (e notificados) quando os ciclos emendam
export const MAX_PLANNED_SEGMENTS = 8;

const pad = (value) => String(value).padStart(2, "0");

const clamp = (value, { min, max }) => Math.min(max, Math.max(min, value));

const toBoundedInt = (raw, fallback, limits) => {
  const numeric = Number(raw);
  const valid =
    Number.isFinite(numeric) && numeric !== 0 ? Math.round(numeric) : fallback;
  return clamp(valid, limits);
};

// Modo do timer pelo id ("focus", "short", "long"); cai no foco se o id for desconhecido
export const getTypeById = (id) =>
  pomodoro.find((p) => p.id === id) ?? pomodoro[0];

// Duração configurada do modo, em segundos. Ex.: foco de 25 min -> 1500
export const getDurationSeconds = (typeId, settings) =>
  settings.durations[typeId] * 60;

// Segundos até `endTime`, arredondando para cima (1,5 s -> 2) e nunca negativo
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

// Uma série de focos (até a pausa longa) atravessa a meia-noite se o último foco terminou
// há no máximo este tempo. Mais que isso, num dia diferente, a série recomeça do zero.
export const SERIES_GAP_MS = 2 * 60 * 60 * 1000;

// Quantos focos a série atual já tem em `now`. `series` = { count, lastEndTime } salvo pelo
// timer; sem ele (versão anterior), vale a contagem do dia, como antes.
export const getSeriesCount = (series, todayCount, now) => {
  if (
    !series ||
    !Number.isFinite(series.lastEndTime) ||
    !Number.isInteger(series.count) ||
    series.count < 0
  ) {
    return todayCount;
  }
  const sameDay = todayKey(series.lastEndTime) === todayKey(now);
  return sameDay || now - series.lastEndTime <= SERIES_GAP_MS
    ? series.count
    : 0;
};

// Soma à série um foco que terminou em `endTime`
export const addFocusToSeries = (series, todayCountBefore, endTime) => ({
  count: getSeriesCount(series, todayCountBefore, endTime) + 1,
  lastEndTime: endTime,
});

// Valida a série salva; qualquer coisa estranha vira null (cai na contagem do dia)
export const normalizeSeries = (raw) =>
  raw &&
  typeof raw === "object" &&
  Number.isInteger(raw.count) &&
  raw.count >= 0 &&
  typeof raw.lastEndTime === "number" &&
  Number.isFinite(raw.lastEndTime)
    ? { count: raw.count, lastEndTime: raw.lastEndTime }
    : null;

// Monta a sequência de ciclos a partir de agora. Sem emendar ciclos, é só o atual.
// Ex.: foco com 0 focos no dia -> foco, curta, foco, curta, foco, curta, foco, longa
export const buildPlan = ({ typeId, seconds, now, focusCount, settings }) => {
  const segments = [{ typeId, startTime: now, endTime: now + seconds * 1000 }];
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
      startTime: last.endTime,
      endTime: last.endTime + getDurationSeconds(nextTypeId, settings) * 1000,
    });
  }
  return segments;
};

// Quantos ciclos do plano já terminaram em `now` (o plano está em ordem de horário)
export const countFinishedSegments = (segments, now) =>
  segments.filter((s) => s.endTime <= now).length;

// Minutos focados num ciclo que terminou. Planos salvos pela versão anterior não têm
// `startTime`; nesse caso vale a duração configurada.
export const getSegmentMinutes = (segment, settings) =>
  segment.startTime != null
    ? Math.round((segment.endTime - segment.startTime) / 60000)
    : settings.durations[segment.typeId];

// Texto da notificação do fim do ciclo `index`: diz qual ciclo começou (se houver
// próximo) e cita a tarefa quando um foco termina
export const getSegmentNotification = (segments, index, settings, task) => {
  const finished = getTypeById(segments[index].typeId);
  const next = segments[index + 1];
  const taskDesc =
    typeof task?.description === "string" ? task.description.trim() : "";
  const taskLine =
    finished.id === "focus" && taskDesc
      ? `Tarefa: ${taskDesc.slice(0, 80)}. `
      : "";

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
  const source =
    saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  const savedDurations =
    source.durations &&
    typeof source.durations === "object" &&
    !Array.isArray(source.durations)
      ? source.durations
      : {};
  return {
    autoStartCycles:
      typeof source.autoStartCycles === "boolean"
        ? source.autoStartCycles
        : DEFAULT_SETTINGS.autoStartCycles,
    vibrate:
      typeof source.vibrate === "boolean"
        ? source.vibrate
        : DEFAULT_SETTINGS.vibrate,
    distinctSounds:
      typeof source.distinctSounds === "boolean"
        ? source.distinctSounds
        : DEFAULT_SETTINGS.distinctSounds,
    hasSeenWelcome: source.hasSeenWelcome === true,
    longBreakInterval: toBoundedInt(
      source.longBreakInterval,
      DEFAULT_SETTINGS.longBreakInterval,
      SETTINGS_LIMITS.longBreakInterval,
    ),
    dailyFocusGoal: toBoundedInt(
      source.dailyFocusGoal,
      DEFAULT_SETTINGS.dailyFocusGoal,
      SETTINGS_LIMITS.dailyFocusGoal,
    ),
    durations: Object.fromEntries(
      Object.keys(DEFAULT_SETTINGS.durations).map((id) => [
        id,
        toBoundedInt(
          savedDurations[id],
          DEFAULT_SETTINGS.durations[id],
          SETTINGS_LIMITS.durations[id],
        ),
      ]),
    ),
  };
};

// Quanto tempo depois do fim de um ciclo ainda vale disparar alerta/vibração pelo app.
// Se a pessoa só abrir o app bem depois, o ciclo já acabou faz tempo e não faz sentido alertar.
export const FOREGROUND_ALERT_WINDOW_MS = 5000;

// Valida e normaliza segmentos salvos antes de restaurar um plano em andamento
export const normalizeSavedSegments = (rawSegments) => {
  if (!Array.isArray(rawSegments)) {
    return null;
  }
  const valid = rawSegments
    .filter(
      (s) =>
        s &&
        typeof s === "object" &&
        typeof s.endTime === "number" &&
        Number.isFinite(s.endTime),
    )
    .map((s) => ({
      ...s,
      typeId: getTypeById(s.typeId).id,
      ...(typeof s.startTime === "number" && Number.isFinite(s.startTime)
        ? { startTime: s.startTime }
        : {}),
    }));
  return valid.length > 0 ? valid : null;
};

// Vibrar pelo próprio app só quando ele está aberto, o ciclo acabou agora e não há
// notificação agendada (se houver, a notificação já vibra, inclusive com a tela bloqueada)
export const shouldVibrateInApp = ({
  finishedSegments,
  now,
  settings,
  appActive,
  notificationsScheduled,
}) =>
  settings.vibrate &&
  appActive &&
  !notificationsScheduled &&
  finishedSegments.some((s) => now - s.endTime <= FOREGROUND_ALERT_WINDOW_MS);

// 1500 -> "25:00". Não usa Date, então funciona acima de 60 minutos ("90:00")
export const formatSeconds = (totalSeconds) =>
  `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
