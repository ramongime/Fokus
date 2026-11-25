/*
 * Versão web de timerNotifications.js (o Metro escolhe este arquivo no navegador).
 * O expo-notifications não agenda notificações locais na web, então os avisos do sistema
 * são no-op. O fim de cada ciclo toca tons gerados pela Web Audio API: eles são agendados
 * no relógio do áudio já no Play (scheduleTimerNotifications), porque o navegador atrasa
 * os temporizadores de abas em segundo plano e o tick do TimerProvider chegaria tarde.
 * O playCycleSound continua como reserva, para quando o agendado não tocou.
 */

// Mesmo padrão da versão nativa; o Vibration do react-native-web usa navigator.vibrate
export const VIBRATION_PATTERN = [0, 400, 200, 400];

// Mesma janela do TimerProvider: ciclo que acabou há mais tempo que isso não toca mais
const LATE_LIMIT_MS = 5000;
// Diferença tolerada entre o relógio do áudio e o do sistema antes de reagendar
const DRIFT_LIMIT_SECONDS = 0.5;
// Abas em segundo plano acordam no máximo 1x por minuto; em primeiro plano, a cada 15 s
const RECONCILE_INTERVAL_MS = 15000;

const TONE_GAP_SECONDS = 0.28;
const TONE_LENGTH_SECONDS = 0.25;

let audioContext;
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

// Agenda os tons a partir de `startAt` (relógio do áudio) e devolve os nós para cancelar
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
      oscillator.disconnect?.();
      volume.disconnect?.();
    } catch {
      // Tom já encerrado
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
    const lateMs = now - alarm.date;
    if (context.currentTime >= alarm.startAt) {
      // Já tocou: fica guardado só enquanto o playCycleSound ainda pode perguntar por ele
      return lateMs <= LATE_LIMIT_MS * 2;
    }
    if (lateMs > LATE_LIMIT_MS) {
      stopTones(alarm.nodes);
      return false;
    }
    const expectedStartAt = context.currentTime + Math.max(0, -lateMs) / 1000;
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

// Só para testes: descarta o contexto e os alarmes guardados entre um teste e outro
export const resetAudioContext = () => {
  clearScheduledAlarms();
  audioContext = null;
};

// Na web não há notificação do sistema: agenda o som de cada fim de ciclo no relógio do
// áudio e devolve [], que o TimerProvider entende como "sem avisos do sistema"
export const scheduleTimerNotifications = async (
  items = [],
  { distinctSounds = false } = {},
) => {
  try {
    clearScheduledAlarms();
    const context = getAudioContext();
    if (!context) {
      return [];
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
  return [];
};

// Como na versão nativa: com ids cancela só aqueles (na web nunca há ids); sem ids, tudo
export const cancelTimerNotifications = async (ids) => {
  if (!ids) {
    clearScheduledAlarms();
  }
};

export const showOngoingNotification = async () => {};

export const dismissOngoingNotification = async () => {};

export const prepareCycleSounds = async () => {
  try {
    await getAudioContext()?.resume();
  } catch (error) {
    console.warn("Não foi possível ativar o som do ciclo", error);
  }
};

// Chamado pelo TimerProvider quando percebe o fim de um ciclo. Se o tom agendado para
// esse ciclo já tocou, não repete; se não tocou (áudio atrasado ou sem agendamento), toca.
export const playCycleSound = async (
  typeId,
  { distinctSounds = true } = {},
) => {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  try {
    const now = Date.now();
    const alarm = scheduledAlarms.find(
      ({ date }) => now - date >= -1000 && now - date <= LATE_LIMIT_MS + 1000,
    );
    if (alarm) {
      const rangOnTime =
        context.state === "running" && context.currentTime >= alarm.startAt - 1;
      if (rangOnTime) {
        return;
      }
      stopTones(alarm.nodes);
      scheduledAlarms = scheduledAlarms.filter((other) => other !== alarm);
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

// Mesma assinatura da versão nativa. Na web o som já é sempre tocado pelo próprio app
// (Web Audio), sem depender de permissão de notificação.
export const playInAppCycleSound = async (soundPhase) =>
  playCycleSound(soundPhase === "pause" ? "short" : "focus", {
    distinctSounds: true,
  });
