import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CHANNEL_ID = "timer";

// Mostra a notificação mesmo com o app aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ensurePermission = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Timer",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  }

  const { granted } = await Notifications.getPermissionsAsync();
  if (granted) {
    return true;
  }
  const request = await Notifications.requestPermissionsAsync();
  return request.granted;
};

// Agenda no sistema operacional, então dispara mesmo com a tela bloqueada ou o app fechado
export const scheduleTimerNotification = async (timerType, endTime) => {
  try {
    if (!(await ensurePermission())) {
      return null;
    }
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: timerType.notification.title,
        body: timerType.notification.body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: endTime,
        channelId: CHANNEL_ID,
      },
    });
  } catch (e) {
    console.warn("Erro ao agendar notificação", e);
    return null;
  }
};

export const cancelTimerNotification = async (id) => {
  try {
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  } catch (e) {
    console.warn("Erro ao cancelar notificação", e);
  }
};
