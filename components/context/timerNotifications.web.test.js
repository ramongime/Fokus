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
      mockAudioContext.resume.mockRejectedValueOnce(new Error("Playback error"));
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
});
