import * as webNotifications from "./timerNotifications.web";
import {
  cancelTimerNotifications,
  dismissOngoingNotification,
  ONGOING_CHANNEL_ID,
  ONGOING_NOTIFICATION_ID,
  scheduleTimerNotifications,
  showOngoingNotification,
  VIBRATION_PATTERN,
} from "./timerNotifications.web";

describe("timerNotifications.web", () => {
  it("exports the standard vibration pattern and ongoing notification constants", () => {
    expect(VIBRATION_PATTERN).toEqual([0, 400, 200, 400]);
    expect(ONGOING_CHANNEL_ID).toBe("timer-active");
    expect(ONGOING_NOTIFICATION_ID).toBe("fokus-timer-ongoing");
  });

  it("exports only notification constants and stubs without foreground audio helpers", () => {
    expect(Object.keys(webNotifications).sort()).toEqual([
      "ONGOING_CHANNEL_ID",
      "ONGOING_NOTIFICATION_ID",
      "VIBRATION_PATTERN",
      "cancelTimerNotifications",
      "dismissOngoingNotification",
      "scheduleTimerNotifications",
      "showOngoingNotification",
    ]);
  });

  it("stubs native notification methods as safe no-ops on web", async () => {
    await expect(
      scheduleTimerNotifications(
        [{ title: "Foco", body: "Fim", date: Date.now() + 60000 }],
        { vibrate: true, distinctSounds: true },
      ),
    ).resolves.toEqual([]);
    await expect(scheduleTimerNotifications()).resolves.toEqual([]);
    await expect(cancelTimerNotifications(["id-1"])).resolves.toBeUndefined();
    await expect(cancelTimerNotifications()).resolves.toBeUndefined();
    await expect(
      showOngoingNotification({
        typeLabel: "Foco",
        endTime: Date.now() + 60000,
      }),
    ).resolves.toBeUndefined();
    await expect(dismissOngoingNotification()).resolves.toBeUndefined();
  });
});
