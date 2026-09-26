/*
 * Regras do timer em funções puras: recebem dados e devolvem um resultado, sem ler
 * o relógio nem salvar nada. Por isso dá para testar tudo em timerLogic.test.js.
 * O `now` (horário atual em ms) sempre vem de quem chama.
 */
import { pomodoro } from "../../constants/pomodoro";
import { DEFAULT_SETTINGS, SETTINGS_LIMITS } from "../../constants/settings";

// Quantos ciclos à frente são planejados (e notificados) quando os ciclos emendam
export const MAX_PLANNED_SEGMENTS = 8;

const pad = (value) => String(value).padStart(2, "0");

const clamp = (value, { min, max }) => Math.min(max, Math.max(min, value));

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
    vibrate:
      typeof saved.vibrate === "boolean"
        ? saved.vibrate
        : DEFAULT_SETTINGS.vibrate,
    hasSeenWelcome: saved.hasSeenWelcome === true,
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

// Quanto tempo depois do fim de um ciclo ainda vale vibrar pelo app. Se a pessoa só
// abrir o app bem depois, o ciclo já acabou faz tempo e não faz sentido vibrar.
export const VIBRATION_WINDOW_MS = 5000;

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
  finishedSegments.some((s) => now - s.endTime <= VIBRATION_WINDOW_MS);

// 1500 -> "25:00". Não usa Date, então funciona acima de 60 minutos ("90:00")
export const formatSeconds = (totalSeconds) =>
  `${pad(Math.floor(totalSeconds / 60))}:${pad(totalSeconds % 60)}`;
