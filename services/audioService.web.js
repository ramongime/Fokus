/*
 * Serviço de áudio na web (selecionado pelo Metro no navegador).
 * Reproduz e agenda os alarmes de conclusão de ciclo via Web Audio API.
 */
import { FOREGROUND_ALERT_WINDOW_MS } from "../components/context/timerLogic";

// Diferença tolerada entre o relógio do áudio e o do sistema antes de reagendar
const DRIFT_LIMIT_SECONDS = 0.5;
// Abas em segundo plano acordam no máximo 1x por minuto; em primeiro plano, a cada 15 s
const RECONCILE_INTERVAL_MS = 15000;

const TONE_GAP_SECONDS = 0.28;
const TONE_LENGTH_SECONDS = 0.25;

let audioContext = null;
// Alarmes agendados: { date, typeId, distinctSounds, startAt, nodes }
// date é o fim do ciclo no relógio do sistema; startAt, o mesmo instante no relógio do áudio
let scheduledAlarms = [];
let reconcileTimer = null;

const getAudioContext = () => {
  const AudioContextConstructor =
    globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AudioContextConstructor) {
    return null;
  }
  if (!audioContext) {
    audioContext = new AudioContextConstructor();
    // Ao voltar de uma suspensão (aba congelada, computador dormindo), confere os horários
    audioContext.addEventListener?.("statechange", reconcileAlarms);
  }
  return audioContext;
};

// Foco termina com dois tons descendentes; pausa, com três ascendentes
const getFrequencies = (typeId, distinctSounds) =>
  !distinctSounds || typeId === "focus"
    ? [659.25, 523.25]
    : [523.25, 783.99, 1046.5];

const scheduleTones = (context, frequencies, startAt) =>
  frequencies.map((frequency, index) => {
    const start = startAt + index * TONE_GAP_SECONDS;
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    volume.gain.setValueAtTime(0, start);
    volume.gain.linearRampToValueAtTime(0.14, start + 0.025);
    volume.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + TONE_LENGTH_SECONDS);
    return { oscillator, volume };
  });

const stopTones = (nodes) => {
  nodes.forEach(({ oscillator, volume }) => {
    try {
      oscillator.stop();
    } catch {
      // Tom já encerrado
    }
    try {
      oscillator.disconnect?.();
      volume.disconnect?.();
    } catch {
      // Nó já desconectado
    }
  });
};

const stopReconciling = () => {
  if (reconcileTimer != null) {
    clearInterval(reconcileTimer);
    reconcileTimer = null;
    globalThis.document?.removeEventListener?.(
      "visibilitychange",
      reconcileAlarms,
    );
  }
};

const startReconciling = () => {
  if (reconcileTimer == null) {
    reconcileTimer = setInterval(reconcileAlarms, RECONCILE_INTERVAL_MS);
    globalThis.document?.addEventListener?.(
      "visibilitychange",
      reconcileAlarms,
    );
  }
};

const clearScheduledAlarms = () => {
  scheduledAlarms.forEach((alarm) => stopTones(alarm.nodes));
  scheduledAlarms = [];
  stopReconciling();
};

// O relógio do áudio para quando o computador dorme ou a aba é congelada, e o do sistema
// não. Sem conferir, o tom tocaria atrasado pelo tempo que o áudio ficou parado.
function reconcileAlarms() {
  const context = audioContext;
  if (!context) {
    clearScheduledAlarms();
    return;
  }
  const now = Date.now();
  scheduledAlarms = scheduledAlarms.filter((alarm) => {
    const elapsedMs = now - alarm.date;
    if (context.currentTime >= alarm.startAt) {
      // Já tocou: fica guardado só enquanto o playCycleSound ainda pode perguntar por ele
      return elapsedMs <= FOREGROUND_ALERT_WINDOW_MS * 2;
    }
    if (elapsedMs > FOREGROUND_ALERT_WINDOW_MS) {
      stopTones(alarm.nodes);
      return false;
    }
    const expectedStartAt =
      context.currentTime + Math.max(0, -elapsedMs) / 1000;
    if (Math.abs(expectedStartAt - alarm.startAt) > DRIFT_LIMIT_SECONDS) {
      stopTones(alarm.nodes);
      alarm.startAt = expectedStartAt;
      alarm.nodes = scheduleTones(
        context,
        getFrequencies(alarm.typeId, alarm.distinctSounds),
        expectedStartAt,
      );
    }
    return true;
  });
  if (scheduledAlarms.length === 0) {
    stopReconciling();
  }
}

export const prepareCycleSounds = async () => {
  try {
    await getAudioContext()?.resume();
  } catch (error) {
    console.warn("Não foi possível ativar o som do ciclo", error);
  }
};

export const playCycleSound = async (
  typeId,
  { distinctSounds = true } = {},
) => {
  try {
    const context = getAudioContext();
    if (!context) {
      return;
    }

    const now = Date.now();
    const alarm = scheduledAlarms.find(
      ({ date }) =>
        now - date >= -1000 && now - date <= FOREGROUND_ALERT_WINDOW_MS + 1000,
    );
    if (alarm) {
      const rangOnTime =
        context.state === "running" && context.currentTime >= alarm.startAt - 1;
      if (rangOnTime) {
        return;
      }
      stopTones(alarm.nodes);
      scheduledAlarms = scheduledAlarms.filter((other) => other !== alarm);
      if (scheduledAlarms.length === 0) {
        stopReconciling();
      }
    }

    await context.resume();
    scheduleTones(
      context,
      getFrequencies(typeId, distinctSounds),
      context.currentTime + 0.03,
    );
  } catch (error) {
    console.warn("Não foi possível tocar o som do ciclo", error);
  }
};

export const scheduleCycleAlarms = async (
  items = [],
  { distinctSounds = false } = {},
) => {
  try {
    clearScheduledAlarms();
    const context = getAudioContext();
    if (!context) {
      return;
    }
    const now = Date.now();
    scheduledAlarms = items
      .map((item) => ({ typeId: item?.typeId, date: Number(item?.date) }))
      .filter(({ date }) => Number.isFinite(date) && date > now)
      .map(({ typeId, date }) => {
        const startAt = context.currentTime + (date - now) / 1000;
        return {
          date,
          typeId,
          distinctSounds,
          startAt,
          nodes: scheduleTones(
            context,
            getFrequencies(typeId, distinctSounds),
            startAt,
          ),
        };
      });
    if (scheduledAlarms.length > 0) {
      startReconciling();
    }
  } catch (error) {
    console.warn("Não foi possível agendar o som do ciclo", error);
  }
};

export const cancelCycleAlarms = async () => {
  clearScheduledAlarms();
};

export const releaseCycleSounds = () => {
  clearScheduledAlarms();
  audioContext?.removeEventListener?.("statechange", reconcileAlarms);
  audioContext = null;
};
