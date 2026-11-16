import {
  cancelTimerNotifications,
  dismissOngoingNotification,
  playCycleSound,
  prepareCycleSounds,
  resetAudioContext,
  scheduleTimerNotifications,
  showOngoingNotification,
  VIBRATION_PATTERN,
} from "./timerNotifications.web";

describe("timerNotifications.web", () => {
  const originalAudioContext = globalThis.AudioContext;
  const originalWebkitAudioContext = globalThis.webkitAudioContext;

  let mockAudioContext;
  let mockOscillator;
  let mockGain;

  beforeEach(() => {
    resetAudioContext();

    mockOscillator = {
      type: "",
      frequency: { value: 0 },
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    };

    mockGain = {
      gain: {
        setValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      },
      connect: jest.fn(),
    };

    mockAudioContext = {
      currentTime: 10,
      destination: {},
      resume: jest.fn().mockResolvedValue(undefined),
      createOscillator: jest.fn(() => mockOscillator),
      createGain: jest.fn(() => mockGain),
    };

    globalThis.AudioContext = jest.fn(() => mockAudioContext);
    delete globalThis.webkitAudioContext;
  });

  afterEach(() => {
    resetAudioContext();
    globalThis.AudioContext = originalAudioContext;
    globalThis.webkitAudioContext = originalWebkitAudioContext;
    jest.restoreAllMocks();
  });

  it("exports the standard vibration pattern", () => {
    expect(VIBRATION_PATTERN).toEqual([0, 400, 200, 400]);
  });

  it("stubs native notification methods cleanly for web", async () => {
    await expect(scheduleTimerNotifications()).resolves.toEqual([]);
    await expect(cancelTimerNotifications()).resolves.toBeUndefined();
    await expect(showOngoingNotification()).resolves.toBeUndefined();
    await expect(dismissOngoingNotification()).resolves.toBeUndefined();
  });

  describe("prepareCycleSounds", () => {
    it("resumes the AudioContext to unlock browser audio", async () => {
      await prepareCycleSounds();
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it("catches and logs error when audio resume fails", async () => {
      mockAudioContext.resume.mockRejectedValueOnce(new Error("Audio blocked"));
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      await prepareCycleSounds();

      expect(warnSpy).toHaveBeenCalledWith(
        "Não foi possível ativar o som do ciclo",
        expect.any(Error),
      );
    });

    it("handles safely when AudioContext is unsupported", async () => {
      delete globalThis.AudioContext;
      await expect(prepareCycleSounds()).resolves.toBeUndefined();
    });
  });

  describe("playCycleSound", () => {
    it("plays focus tones when typeId is focus", async () => {
      const frequencies = [];
      mockAudioContext.createOscillator = jest.fn(() => {
        const osc = {
          type: "",
          frequency: {
            set value(v) {
              frequencies.push(v);
            },
          },
          connect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
        };
        return osc;
      });

      await playCycleSound("focus");

      expect(mockAudioContext.resume).toHaveBeenCalled();
      expect(frequencies).toEqual([659.25, 523.25]);
    });

    it("plays break tones when typeId is break/short/long", async () => {
      const frequencies = [];
      mockAudioContext.createOscillator = jest.fn(() => {
        const osc = {
          type: "",
          frequency: {
            set value(v) {
              frequencies.push(v);
            },
          },
          connect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
        };
        return osc;
      });

      await playCycleSound("short");

      expect(mockAudioContext.resume).toHaveBeenCalled();
      expect(frequencies).toEqual([523.25, 783.99, 1046.5]);
    });

    it("plays standard tone when distinctSounds is false", async () => {
      const frequencies = [];
      mockAudioContext.createOscillator = jest.fn(() => {
        const osc = {
          type: "",
          frequency: {
            set value(v) {
              frequencies.push(v);
            },
          },
          connect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
        };
        return osc;
      });

      await playCycleSound("short", { distinctSounds: false });

      expect(frequencies).toEqual([659.25, 523.25]);
    });

    it("handles gracefully when AudioContext throws during playback", async () => {
      mockAudioContext.resume.mockRejectedValueOnce(
        new Error("Playback error"),
      );
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      await playCycleSound("focus");

      expect(warnSpy).toHaveBeenCalledWith(
        "Não foi possível tocar o som do ciclo",
        expect.any(Error),
      );
    });

    it("returns early without error when AudioContext is unsupported", async () => {
      delete globalThis.AudioContext;
      await expect(playCycleSound("focus")).resolves.toBeUndefined();
    });
  });

  // Abas em segundo plano têm os temporizadores atrasados pelo navegador, então o
  // alarme é agendado no relógio da Web Audio no Play, em vez de depender do tick.
  describe("scheduled cycle alarms", () => {
    const NOW = new Date("2026-11-16T12:00:00Z").getTime();
    const MINUTE = 60 * 1000;
    let oscillators;

    const startedAt = () => oscillators.map((o) => o.start.mock.calls[0][0]);
    const stopped = () =>
      oscillators.filter((o) => o.stop.mock.calls.length > 1);

    beforeEach(() => {
      jest.useFakeTimers({ now: NOW });
      oscillators = [];
      mockAudioContext.state = "running";
      mockAudioContext.currentTime = 10;
      mockAudioContext.createOscillator = jest.fn(() => {
        const oscillator = {
          type: "",
          frequency: { value: 0 },
          connect: jest.fn(),
          disconnect: jest.fn(),
          start: jest.fn(),
          stop: jest.fn(),
        };
        oscillators.push(oscillator);
        return oscillator;
      });
      mockGain.disconnect = jest.fn();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    // Avança o relógio do sistema e o do áudio juntos, como numa aba funcionando
    const advance = (ms) => {
      mockAudioContext.currentTime += ms / 1000;
      jest.setSystemTime(Date.now() + ms);
    };

    it("schedules each segment's tones on the audio clock and reports no system notifications", async () => {
      const ids = await scheduleTimerNotifications(
        [
          { typeId: "focus", date: NOW + 25 * MINUTE },
          { typeId: "short", date: NOW + 30 * MINUTE },
        ],
        { distinctSounds: true },
      );

      expect(ids).toEqual([]);
      // foco: 2 tons a partir de 25 min; pausa: 3 tons a partir de 30 min
      expect(oscillators.map((o) => o.frequency.value)).toEqual([
        659.25, 523.25, 523.25, 783.99, 1046.5,
      ]);
      expect(startedAt()[0]).toBeCloseTo(10 + 25 * 60, 3);
      expect(startedAt()[2]).toBeCloseTo(10 + 30 * 60, 3);
    });

    it("uses the standard tone for every segment when distinctSounds is off", async () => {
      await scheduleTimerNotifications(
        [{ typeId: "short", date: NOW + 5 * MINUTE }],
        { distinctSounds: false },
      );

      expect(oscillators.map((o) => o.frequency.value)).toEqual([
        659.25, 523.25,
      ]);
    });

    it("ignores segments that already ended", async () => {
      await scheduleTimerNotifications([
        { typeId: "focus", date: NOW - MINUTE },
      ]);

      expect(oscillators).toHaveLength(0);
    });

    it("silences every scheduled tone when the timer is paused", async () => {
      await scheduleTimerNotifications([
        { typeId: "focus", date: NOW + 25 * MINUTE },
      ]);

      await cancelTimerNotifications();

      expect(stopped()).toHaveLength(2);
    });

    it("keeps scheduled tones when cancelling by ids, like the native module", async () => {
      await scheduleTimerNotifications([
        { typeId: "focus", date: NOW + 25 * MINUTE },
      ]);

      await cancelTimerNotifications([]);

      expect(stopped()).toHaveLength(0);
    });

    it("replaces the previous plan's tones when a new plan is scheduled", async () => {
      await scheduleTimerNotifications([
        { typeId: "focus", date: NOW + 25 * MINUTE },
      ]);
      const firstPlan = [...oscillators];

      await scheduleTimerNotifications([
        { typeId: "focus", date: NOW + 10 * MINUTE },
      ]);

      expect(firstPlan.every((o) => o.stop.mock.calls.length > 1)).toBe(true);
      expect(oscillators).toHaveLength(4);
    });

    it("does not play twice when the scheduled tone already rang", async () => {
      await scheduleTimerNotifications([
        { typeId: "focus", date: NOW + 25 * MINUTE },
      ]);
      advance(25 * MINUTE + 500);

      await playCycleSound("focus");

      expect(oscillators).toHaveLength(2);
    });

    it("plays right away when the audio clock fell behind and the scheduled tone is late", async () => {
      await scheduleTimerNotifications([
        { typeId: "focus", date: NOW + 25 * MINUTE },
      ]);
      // O relógio do áudio ficou parado (aba suspensa); só o do sistema andou
      jest.setSystemTime(NOW + 25 * MINUTE + 500);

      await playCycleSound("focus");

      expect(stopped()).toHaveLength(2);
      expect(oscillators).toHaveLength(4);
      expect(startedAt()[2]).toBeCloseTo(10.03, 3);
    });

    it("drops a tone whose time passed while the computer slept", async () => {
      await scheduleTimerNotifications([
        { typeId: "focus", date: NOW + 25 * MINUTE },
      ]);
      // Dormiu 40 min: o relógio do áudio não andou, o do sistema sim
      jest.setSystemTime(NOW + 40 * MINUTE);

      jest.advanceTimersByTime(15 * 1000);

      expect(stopped()).toHaveLength(2);
      expect(oscillators).toHaveLength(2);
    });

    it("moves a tone back to the right moment after the audio clock drifts", async () => {
      await scheduleTimerNotifications([
        { typeId: "focus", date: NOW + 25 * MINUTE },
      ]);
      // Áudio parado por 10 min, sistema andou 10 min: faltam 15 min
      jest.setSystemTime(NOW + 10 * MINUTE);

      jest.advanceTimersByTime(15 * 1000);

      expect(stopped()).toHaveLength(2);
      expect(oscillators).toHaveLength(4);
      // advanceTimersByTime também andou 15 s no relógio do sistema
      expect(startedAt()[2]).toBeCloseTo(10 + 15 * 60 - 15, 3);
    });

    it("leaves on-time tones untouched during the periodic check", async () => {
      await scheduleTimerNotifications([
        { typeId: "focus", date: NOW + 25 * MINUTE },
      ]);

      mockAudioContext.currentTime += 15;
      jest.advanceTimersByTime(15 * 1000);

      expect(stopped()).toHaveLength(0);
      expect(oscillators).toHaveLength(2);
    });

    it("schedules nothing and does not fail when AudioContext is unsupported", async () => {
      delete globalThis.AudioContext;

      await expect(
        scheduleTimerNotifications([
          { typeId: "focus", date: NOW + 25 * MINUTE },
        ]),
      ).resolves.toEqual([]);
    });
  });
});
