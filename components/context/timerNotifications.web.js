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
