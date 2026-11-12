/*
 * Notificações locais do timer. São agendadas no próprio iOS/Android para um horário
 * exato, então aparecem mesmo com a tela bloqueada ou o app fechado. Não há servidor
 * nem push: tudo acontece no aparelho.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Vibra, pausa, vibra (ms). Usado nos canais do Android e na vibração pelo app.
export const VIBRATION_PATTERN = [0, 400, 200, 400];

// Os canais antigos são mantidos para ciclos sem som personalizado.
const LEGACY_CHANNELS = [
  { id: "cycles", name: "Fim do ciclo", sound: "default", vibrate: true },
  {
    id: "cycles-quiet",
    name: "Fim do ciclo (sem vibrar)",
    sound: "default",
    vibrate: false,
  },
];

// O Android congela as opções de som ao criar um canal. Cada fase ganha canais novos.
const CUSTOM_SOUND_CHANNELS = [
  {
    id: "cycles-focus-vibrate",
    name: "Fim do foco (som Fokus, vibrar)",
    sound: "focus.wav",
    vibrate: true,
  },
  {
    id: "cycles-focus-quiet",
    name: "Fim do foco (som Fokus, sem vibrar)",
    sound: "focus.wav",
    vibrate: false,
  },
  {
    id: "cycles-break-vibrate",
    name: "Fim da pausa (som Fokus, vibrar)",
    sound: "break.wav",
    vibrate: true,
  },
  {
    id: "cycles-break-quiet",
    name: "Fim da pausa (som Fokus, sem vibrar)",
    sound: "break.wav",
    vibrate: false,
  },
];

const ALL_CHANNELS = [...LEGACY_CHANNELS, ...CUSTOM_SOUND_CHANNELS];

// Canal da versão inicial, criado sem vibração
const LEGACY_CHANNEL_ID = "timer";

// Canal e identificador da notificação fixa contínua do Android
export const ONGOING_CHANNEL_ID = "timer-active";
export const ONGOING_NOTIFICATION_ID = "fokus-timer-ongoing";

// Mostra a notificação mesmo com o app aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Cria os canais (Android) e pede permissão só se ainda não foi concedida.
// Se a pessoa negar, o timer funciona normalmente, só sem os avisos.
const ensurePermission = async () => {
  if (Platform.OS === "android") {
    await Notifications.deleteNotificationChannelAsync(LEGACY_CHANNEL_ID);
    for (const channel of ALL_CHANNELS) {
      await Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        // O enum existe no build do expo-notifications; o plugin import não o enxerga
        // eslint-disable-next-line import/namespace
        importance: Notifications.AndroidImportance.HIGH,
        sound: channel.sound,
        enableVibrate: channel.vibrate,
        vibrationPattern: channel.vibrate ? VIBRATION_PATTERN : null,
      });
    }
    await Notifications.setNotificationChannelAsync(ONGOING_CHANNEL_ID, {
      name: "Ciclo em andamento",
      // eslint-disable-next-line import/namespace
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      enableVibrate: false,
    });
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
  { vibrate = true, distinctSounds = false } = {},
) => {
  try {
    if (!(await ensurePermission())) {
      return [];
    }
    return await Promise.all(
      items.map(({ title, body, date, typeId }) => {
        const soundPhase = typeId === "focus" ? "focus" : "break";
        const customSound = distinctSounds && typeId != null;
        const channelId = customSound
          ? `cycles-${soundPhase}-${vibrate ? "vibrate" : "quiet"}`
          : vibrate
            ? "cycles"
            : "cycles-quiet";
        const sound = customSound ? `${soundPhase}.wav` : true;

        return Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound,
            vibrate: vibrate ? VIBRATION_PATTERN : undefined,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
            channelId,
          },
        });
      }),
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
    await dismissOngoingNotification();
  } catch (e) {
    console.warn("Erro ao cancelar notificações", e);
  }
};

// Exibe a notificação fixa na barra de status do Android enquanto o timer roda
export const showOngoingNotification = async ({ typeLabel, endTime }) => {
  if (Platform.OS !== "android") {
    return;
  }
  try {
    const hasPermission = await ensurePermission();
    if (!hasPermission) {
      return;
    }
    const endDate = new Date(endTime);
    const timeString = endDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    await Notifications.scheduleNotificationAsync({
      identifier: ONGOING_NOTIFICATION_ID,
      content: {
        title: `Fokus • ${typeLabel}`,
        body: `Em andamento. Término previsto às ${timeString}`,
        sticky: true,
        priority: "low",
      },
      trigger: { channelId: ONGOING_CHANNEL_ID },
    });
  } catch (e) {
    console.warn("Erro ao exibir notificação contínua:", e);
  }
};

// Remove a notificação fixa da barra de status quando pausado ou finalizado
export const dismissOngoingNotification = async () => {
  if (Platform.OS !== "android") {
    return;
  }
  try {
    await Notifications.dismissNotificationAsync(ONGOING_NOTIFICATION_ID);
  } catch {
    // Ignora se já descartada
  }
};

// Emite aviso sonoro e vibratório imediato ao atingir 00:00 (primeiro plano)
export const playCycleSound = async (
  typeId,
  { distinctSounds = true, vibrate = true } = {},
) => {
  try {
    const hasPermission = await ensurePermission();
    if (!hasPermission) {
      return;
    }
    const soundPhase = typeId === "focus" ? "focus" : "break";
    const customSound = distinctSounds && typeId != null;
    const channelId = customSound
      ? `cycles-${soundPhase}-${vibrate ? "vibrate" : "quiet"}`
      : vibrate
        ? "cycles"
        : "cycles-quiet";
    const sound = customSound ? `${soundPhase}.wav` : true;

    await Notifications.scheduleNotificationAsync({
      content: {
        title:
          typeId === "focus" ? "Ciclo de foco concluído!" : "Pausa concluída!",
        body:
          typeId === "focus"
            ? "Excelente foco! Hora de relaxar a mente."
            : "Pausa finalizada. Pronto para focar novamente?",
        sound,
        vibrate: vibrate ? VIBRATION_PATTERN : undefined,
      },
      trigger: channelId ? { channelId } : null,
    });
  } catch (e) {
    console.warn("Erro ao emitir alerta sonoro de conclusão:", e);
  }
};

export const prepareCycleSounds = async () => {};
