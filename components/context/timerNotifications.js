/*
 * Notificações locais do timer. São agendadas no próprio iOS/Android para um horário
 * exato, então aparecem mesmo com a tela bloqueada ou o app fechado. Não há servidor
 * nem push: tudo acontece no aparelho.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Vibra, pausa, vibra (ms). Usado nos canais do Android e na vibração pelo app.
export const VIBRATION_PATTERN = [0, 400, 200, 400];

// No Android, cada notificação pertence a um canal que define prioridade, som e vibração.
// Um canal não pode ser alterado depois de criado, por isso há um com e outro sem vibração.
const CHANNELS = {
  vibrate: { id: "cycles", name: "Fim do ciclo", vibrate: true },
  quiet: {
    id: "cycles-quiet",
    name: "Fim do ciclo (sem vibrar)",
    vibrate: false,
  },
};
// Canal da versão anterior, criado sem vibração
const LEGACY_CHANNEL_ID = "timer";

// Mostra a notificação mesmo com o app aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Cria o canal (Android) e pede permissão só se ainda não foi concedida.
// Se a pessoa negar, o timer funciona normalmente, só sem os avisos.
const ensurePermission = async () => {
  if (Platform.OS === "android") {
    await Notifications.deleteNotificationChannelAsync(LEGACY_CHANNEL_ID);
    for (const channel of Object.values(CHANNELS)) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        enableVibrate: channel.vibrate,
        vibrationPattern: channel.vibrate ? VIBRATION_PATTERN : null,
      });
    }
  }

  const { granted } = await Notifications.getPermissionsAsync();
  if (granted) {
    return true;
  }
  const request = await Notifications.requestPermissionsAsync();
  return request.granted;
};

// Agenda no sistema operacional, então dispara mesmo com a tela bloqueada ou o app fechado.
// Cada item: { title, body, date }. Retorna os ids agendados.
export const scheduleTimerNotifications = async (
  items,
  { vibrate = true } = {},
) => {
  const channelId = vibrate ? CHANNELS.vibrate.id : CHANNELS.quiet.id;
  try {
    if (!(await ensurePermission())) {
      return [];
    }
    return await Promise.all(
      items.map(({ title, body, date }) =>
        Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            vibrate: vibrate ? VIBRATION_PATTERN : undefined,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
            channelId,
          },
        }),
      ),
    );
  } catch (e) {
    console.warn("Erro ao agendar notificações", e);
    return [];
  }
};

// Sem ids, cancela tudo o que o app agendou
export const cancelTimerNotifications = async (ids) => {
  try {
    if (ids) {
      await Promise.all(
        ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)),
      );
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  } catch (e) {
    console.warn("Erro ao cancelar notificações", e);
  }
};
