import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  cancelTimerNotifications,
  scheduleTimerNotifications,
  VIBRATION_PATTERN,
} from "./timerNotifications";

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  deleteNotificationChannelAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  AndroidImportance: {
    HIGH: 4,
  },
  SchedulableTriggerInputTypes: {
    DATE: "date",
  },
}));

describe("timerNotifications", () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    Platform.OS = "ios";
    Notifications.getPermissionsAsync.mockResolvedValue({ granted: true });
    Notifications.requestPermissionsAsync.mockResolvedValue({ granted: true });
    Notifications.scheduleNotificationAsync.mockReset();
    Notifications.cancelScheduledNotificationAsync.mockReset();
    Notifications.cancelAllScheduledNotificationsAsync.mockReset();
    Notifications.deleteNotificationChannelAsync.mockReset();
    Notifications.setNotificationChannelAsync.mockReset();
    Notifications.scheduleNotificationAsync.mockImplementation(
      async ({ trigger }) => `notif-id-${trigger.date}`,
    );
  });

  afterEach(() => {
    Platform.OS = originalPlatform;
  });

  describe("VIBRATION_PATTERN", () => {
    it("exports the expected vibration pattern array", () => {
      expect(VIBRATION_PATTERN).toEqual([0, 400, 200, 400]);
    });
  });

  describe("setNotificationHandler", () => {
    it("configures the notification handler to show alert and play sound", async () => {
      expect(Notifications.setNotificationHandler).toHaveBeenCalledWith({
        handleNotification: expect.any(Function),
      });

      const config = Notifications.setNotificationHandler.mock.calls[0][0];
      const result = await config.handleNotification();
      expect(result).toEqual({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      });
    });
  });

  describe("scheduleTimerNotifications", () => {
    it("schedules notifications when permissions are already granted", async () => {
      const targetDate = Date.now() + 1500000;
      const items = [
        {
          title: "Foco concluído!",
          body: "Hora de descansar",
          date: targetDate,
        },
      ];

      const ids = await scheduleTimerNotifications(items, { vibrate: true });

      expect(ids).toEqual([`notif-id-${targetDate}`]);
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: "Foco concluído!",
          body: "Hora de descansar",
          sound: true,
          vibrate: VIBRATION_PATTERN,
        },
        trigger: {
          type: "date",
          date: targetDate,
          channelId: "cycles",
        },
      });
    });

    it("uses cycles-quiet channel and disables vibration when vibrate is false", async () => {
      const targetDate = Date.now() + 300000;
      const items = [
        {
          title: "Pausa concluída!",
          body: "Pronto para o próximo foco?",
          date: targetDate,
        },
      ];

      const ids = await scheduleTimerNotifications(items, { vibrate: false });

      expect(ids).toEqual([`notif-id-${targetDate}`]);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: "Pausa concluída!",
          body: "Pronto para o próximo foco?",
          sound: true,
          vibrate: undefined,
        },
        trigger: {
          type: "date",
          date: targetDate,
          channelId: "cycles-quiet",
        },
      });
    });

    it("requests permission when getPermissionsAsync returns false, and succeeds if user grants", async () => {
      Notifications.getPermissionsAsync.mockResolvedValueOnce({
        granted: false,
      });
      Notifications.requestPermissionsAsync.mockResolvedValueOnce({
        granted: true,
      });

      const items = [
        { title: "Teste", body: "Mensagem", date: Date.now() + 60000 },
      ];
      const ids = await scheduleTimerNotifications(items);

      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(ids).toHaveLength(1);
    });

    it("returns empty array and skips scheduling if user denies permission", async () => {
      Notifications.getPermissionsAsync.mockResolvedValueOnce({
        granted: false,
      });
      Notifications.requestPermissionsAsync.mockResolvedValueOnce({
        granted: false,
      });

      const items = [
        { title: "Teste", body: "Mensagem", date: Date.now() + 60000 },
      ];
      const ids = await scheduleTimerNotifications(items);

      expect(ids).toEqual([]);
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it("purges legacy channels and registers cycles and cycles-quiet on Android", async () => {
      Platform.OS = "android";

      const items = [
        { title: "Foco", body: "Descanso", date: Date.now() + 60000 },
      ];
      await scheduleTimerNotifications(items);

      expect(Notifications.deleteNotificationChannelAsync).toHaveBeenCalledWith(
        "timer",
      );
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        "cycles",
        {
          name: "Fim do ciclo",
          importance: 4,
          sound: "default",
          enableVibrate: true,
          vibrationPattern: VIBRATION_PATTERN,
        },
      );
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        "cycles-quiet",
        {
          name: "Fim do ciclo (sem vibrar)",
          importance: 4,
          sound: "default",
          enableVibrate: false,
          vibrationPattern: null,
        },
      );
    });

    it("handles scheduling exceptions gracefully by returning empty array", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      Notifications.scheduleNotificationAsync.mockRejectedValueOnce(
        new Error("Scheduling failed"),
      );

      const items = [{ title: "Foco", body: "Erro", date: Date.now() + 60000 }];
      const ids = await scheduleTimerNotifications(items);

      expect(ids).toEqual([]);
      expect(warnSpy).toHaveBeenCalledWith(
        "Erro ao agendar notificações",
        expect.any(Error),
      );
      warnSpy.mockRestore();
    });
  });

  describe("cancelTimerNotifications", () => {
    it("cancels specific notification IDs when provided", async () => {
      const ids = ["id-1", "id-2"];
      await cancelTimerNotifications(ids);

      expect(
        Notifications.cancelScheduledNotificationAsync,
      ).toHaveBeenCalledTimes(2);
      expect(
        Notifications.cancelScheduledNotificationAsync,
      ).toHaveBeenCalledWith("id-1");
      expect(
        Notifications.cancelScheduledNotificationAsync,
      ).toHaveBeenCalledWith("id-2");
      expect(
        Notifications.cancelAllScheduledNotificationsAsync,
      ).not.toHaveBeenCalled();
    });

    it("cancels all scheduled notifications when no IDs are provided", async () => {
      await cancelTimerNotifications();

      expect(
        Notifications.cancelAllScheduledNotificationsAsync,
      ).toHaveBeenCalledTimes(1);
      expect(
        Notifications.cancelScheduledNotificationAsync,
      ).not.toHaveBeenCalled();
    });

    it("logs warning without throwing when cancellation fails", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      Notifications.cancelAllScheduledNotificationsAsync.mockRejectedValueOnce(
        new Error("Cancel failed"),
      );

      await cancelTimerNotifications();

      expect(warnSpy).toHaveBeenCalledWith(
        "Erro ao cancelar notificações",
        expect.any(Error),
      );
      warnSpy.mockRestore();
    });
  });
});
