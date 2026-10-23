/*
 * Versão web de timerNotifications.js (o Metro escolhe este arquivo no navegador).
 * O expo-notifications não agenda notificações locais na web, então aqui não há avisos:
 * o timer funciona normalmente e o app vibra por conta própria quando o ciclo termina.
 */

// Mesmo padrão da versão nativa; o Vibration do react-native-web usa navigator.vibrate
export const VIBRATION_PATTERN = [0, 400, 200, 400];

// Nenhuma notificação agendada: o TimerProvider entende [] como "sem avisos do sistema"
export const scheduleTimerNotifications = async () => [];

export const cancelTimerNotifications = async () => {};

let audioContext;

const getAudioContext = () => {
  const AudioContextConstructor =
    globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AudioContextConstructor) {
    return null;
  }
  audioContext ??= new AudioContextConstructor();
  return audioContext;
};

export const prepareCycleSounds = async () => {
  try {
    await getAudioContext()?.resume();
  } catch (error) {
    console.warn("Não foi possível ativar o som do ciclo", error);
  }
};

// No navegador, usa tons gerados localmente para diferenciar foco e pausa.
export const playCycleSound = async (typeId) => {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  try {
    await context.resume();
    const frequencies =
      typeId === "focus" ? [659.25, 523.25] : [523.25, 783.99, 1046.5];
    const startAt = context.currentTime + 0.03;
    frequencies.forEach((frequency, index) => {
      const start = startAt + index * 0.28;
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
      oscillator.stop(start + 0.25);
    });
  } catch (error) {
    console.warn("Não foi possível tocar o som do ciclo", error);
  }
};
