/*
 * Versão web de timerNotifications.js (o Metro escolhe este arquivo no navegador).
 * O expo-notifications não agenda notificações locais nem mantém Ongoing Notification na
 * web, então os métodos abaixo são no-op em paridade com a versão nativa. O áudio dos
 * ciclos na web fica integralmente em services/audioService.web.js.
 */

// Mesmo padrão da versão nativa; o Vibration do react-native-web usa navigator.vibrate
export const VIBRATION_PATTERN = [0, 400, 200, 400];

// Identificadores espelhados para paridade de contrato com timerNotifications.js
export const ONGOING_CHANNEL_ID = "timer-active";
export const ONGOING_NOTIFICATION_ID = "fokus-timer-ongoing";

export const scheduleTimerNotifications = async () => [];

export const cancelTimerNotifications = async () => {};

export const showOngoingNotification = async () => {};

export const dismissOngoingNotification = async () => {};
