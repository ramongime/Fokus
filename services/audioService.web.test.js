import {
  cancelCycleAlarms,
  playCycleSound,
  prepareCycleSounds,
  releaseCycleSounds,
  scheduleCycleAlarms,
} from "./audioService.web";

describe("audioService.web", () => {
  const originalAudioContext = globalThis.AudioContext;
  const originalWebkitAudioContext = globalThis.webkitAudioContext;
  const originalDocument = globalThis.document;

  let mockAudioContext;
  let oscillators;
  let gains;
  let documentListeners;
  let audioContextListeners;

  beforeEach(() => {
    releaseCycleSounds();
    oscillators = [];
    gains = [];
    documentListeners = {};
    audioContextListeners = {};

    mockAudioContext = {
      state: "running",
      currentTime: 10,
      destination: {},
      resume: jest.fn().mockResolvedValue(undefined),
      createOscillator: jest.fn(() => {
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
      }),
      createGain: jest.fn(() => {
        const gain = {
          gain: {
            setValueAtTime: jest.fn(),
            linearRampToValueAtTime: jest.fn(),
            exponentialRampToValueAtTime: jest.fn(),
          },
          connect: jest.fn(),
          disconnect: jest.fn(),
        };
        gains.push(gain);
        return gain;
      }),
      addEventListener: jest.fn((event, handler) => {
        audioContextListeners[event] = handler;
      }),
      removeEventListener: jest.fn((event, handler) => {
        if (audioContextListeners[event] === handler) {
          delete audioContextListeners[event];
        }
      }),
    };

    globalThis.AudioContext = jest.fn(() => mockAudioContext);
    delete globalThis.webkitAudioContext;
    globalThis.document = {
      addEventListener: jest.fn((event, handler) => {
        documentListeners[event] = handler;
      }),
      removeEventListener: jest.fn((event, handler) => {
        if (documentListeners[event] === handler) {
          delete documentListeners[event];
        }
      }),
    };
  });

  afterEach(() => {
    releaseCycleSounds();
    globalThis.AudioContext = originalAudioContext;
    globalThis.webkitAudioContext = originalWebkitAudioContext;
    globalThis.document = originalDocument;
    jest.restoreAllMocks();
  });

  describe("prepareCycleSounds", () => {
    it("resumes the AudioContext to unlock browser audio", async () => {
      await prepareCycleSounds();

      expect(globalThis.AudioContext).toHaveBeenCalledTimes(1);
      expect(mockAudioContext.resume).toHaveBeenCalledTimes(1);
    });

    it("falls back to webkitAudioContext when AudioContext is unavailable", async () => {
      delete globalThis.AudioContext;
      globalThis.webkitAudioContext = jest.fn(() => mockAudioContext);

      await prepareCycleSounds();

      expect(globalThis.webkitAudioContext).toHaveBeenCalledTimes(1);
      expect(mockAudioContext.resume).toHaveBeenCalledTimes(1);
    });

    it("catches and logs a warning when AudioContext resume fails", async () => {
      mockAudioContext.resume.mockRejectedValueOnce(new Error("Audio blocked"));
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      await expect(prepareCycleSounds()).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledWith(
        "Não foi possível ativar o som do ciclo",
        expect.any(Error),
      );
    });

    it("resolves safely when AudioContext is unsupported", async () => {
      delete globalThis.AudioContext;

      await expect(prepareCycleSounds()).resolves.toBeUndefined();
    });
  });

  describe("playCycleSound", () => {
    it("plays focus descending sine tones with gain envelope when typeId is focus", async () => {
      await playCycleSound("focus");

      expect(mockAudioContext.resume).toHaveBeenCalledTimes(1);
      expect(oscillators.map((o) => o.frequency.value)).toEqual([
        659.25, 523.25,
      ]);
      expect(oscillators.every((o) => o.type === "sine")).toBe(true);
      expect(oscillators[0].start).toHaveBeenCalledWith(10.03);
      expect(oscillators[0].stop).toHaveBeenCalledWith(10.03 + 0.25);
      expect(oscillators[1].start.mock.calls[0][0]).toBeCloseTo(
        10.03 + 0.28,
        5,
      );
      expect(oscillators[1].stop.mock.calls[0][0]).toBeCloseTo(
        10.03 + 0.28 + 0.25,
        5,
      );
      expect(gains[0].gain.setValueAtTime).toHaveBeenCalledWith(0, 10.03);
      expect(gains[0].gain.linearRampToValueAtTime).toHaveBeenCalledWith(
        0.14,
        10.03 + 0.025,
      );
      expect(gains[0].gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(
        0.001,
        10.03 + 0.24,
      );
      expect(oscillators[0].connect).toHaveBeenCalledWith(gains[0]);
      expect(gains[0].connect).toHaveBeenCalledWith(
        mockAudioContext.destination,
      );
    });

    it("plays break ascending tones when typeId is short or long", async () => {
      await playCycleSound("short");

      expect(mockAudioContext.resume).toHaveBeenCalledTimes(1);
      expect(oscillators.map((o) => o.frequency.value)).toEqual([
        523.25, 783.99, 1046.5,
      ]);

      oscillators.length = 0;
      await playCycleSound("long");

      expect(oscillators.map((o) => o.frequency.value)).toEqual([
        523.25, 783.99, 1046.5,
      ]);
    });

    it("plays standard focus tones when distinctSounds is false", async () => {
      await playCycleSound("short", { distinctSounds: false });

      expect(oscillators.map((o) => o.frequency.value)).toEqual([
        659.25, 523.25,
      ]);
    });

    it("resolves safely when AudioContext is unsupported", async () => {
      delete globalThis.AudioContext;

      await expect(playCycleSound("focus")).resolves.toBeUndefined();
    });

    it("catches and logs a warning when playback fails", async () => {
      mockAudioContext.resume.mockRejectedValueOnce(
        new Error("Playback error"),
      );
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      await expect(playCycleSound("focus")).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledWith(
        "Não foi possível tocar o som do ciclo",
        expect.any(Error),
      );
    });
  });

  describe("scheduleCycleAlarms and cancelCycleAlarms", () => {
    const NOW = new Date("2026-11-16T12:00:00Z").getTime();
    const MINUTE = 60 * 1000;

    const startedAt = () => oscillators.map((o) => o.start.mock.calls[0][0]);
    const stopped = () =>
      oscillators.filter((o) => o.stop.mock.calls.length > 1);

    // Avança o relógio do sistema e o do áudio juntos, como numa aba ativa
    const advance = (ms) => {
      mockAudioContext.currentTime += ms / 1000;
      jest.setSystemTime(Date.now() + ms);
    };

    beforeEach(() => {
      jest.useFakeTimers({ now: NOW });
    });

    afterEach(() => {
      releaseCycleSounds();
      jest.useRealTimers();
    });

    it("schedules multiple future segments on the audio clock with distinct tones", async () => {
      const result = await scheduleCycleAlarms(
        [
          { typeId: "focus", date: NOW + 25 * MINUTE },
          { typeId: "short", date: NOW + 30 * MINUTE },
        ],
        { distinctSounds: true },
      );

      expect(result).toBeUndefined();
      // foco: 2 tons a partir de 25 min; pausa: 3 tons a partir de 30 min
      expect(oscillators.map((o) => o.frequency.value)).toEqual([
        659.25, 523.25, 523.25, 783.99, 1046.5,
      ]);
      expect(startedAt()[0]).toBeCloseTo(10 + 25 * 60, 3);
      expect(startedAt()[2]).toBeCloseTo(10 + 30 * 60, 3);
    });

    it("uses the standard focus tone for breaks when distinctSounds is false", async () => {
      await scheduleCycleAlarms([{ typeId: "short", date: NOW + 5 * MINUTE }], {
        distinctSounds: false,
      });

      expect(oscillators.map((o) => o.frequency.value)).toEqual([
        659.25, 523.25,
      ]);
    });

    it("ignores past and invalid segments", async () => {
      await scheduleCycleAlarms([
        { typeId: "focus", date: NOW - MINUTE },
        { typeId: "focus", date: NOW },
        { typeId: "short", date: Number.NaN },
        { typeId: "short", date: Number.POSITIVE_INFINITY },
        { typeId: "short", date: "invalid" },
        null,
      ]);

      expect(oscillators).toHaveLength(0);
    });

    it("stops and disconnects all scheduled nodes when cancelCycleAlarms is called", async () => {
      await scheduleCycleAlarms([{ typeId: "focus", date: NOW + 25 * MINUTE }]);

      await expect(cancelCycleAlarms()).resolves.toBeUndefined();

      expect(stopped()).toHaveLength(2);
      expect(
        oscillators.every((o) => o.disconnect.mock.calls.length === 1),
      ).toBe(true);
      expect(gains.every((g) => g.disconnect.mock.calls.length === 1)).toBe(
        true,
      );
    });

    it("replaces the previous plan by stopping and disconnecting previous tones", async () => {
      await scheduleCycleAlarms([{ typeId: "focus", date: NOW + 25 * MINUTE }]);
      const firstPlan = [...oscillators];
      const firstGains = [...gains];

      await scheduleCycleAlarms([{ typeId: "focus", date: NOW + 10 * MINUTE }]);

      expect(firstPlan.every((o) => o.stop.mock.calls.length > 1)).toBe(true);
      expect(firstPlan.every((o) => o.disconnect.mock.calls.length === 1)).toBe(
        true,
      );
      expect(
        firstGains.every((g) => g.disconnect.mock.calls.length === 1),
      ).toBe(true);
      expect(oscillators).toHaveLength(4);
      expect(startedAt()[2]).toBeCloseTo(10 + 10 * 60, 3);
    });

    it("does not play twice when the scheduled tone already rang on time", async () => {
      await scheduleCycleAlarms([{ typeId: "focus", date: NOW + 25 * MINUTE }]);
      advance(25 * MINUTE + 500);

      await playCycleSound("focus");

      expect(oscillators).toHaveLength(2);
    });

    it("cancels the late scheduled tone and plays right away when the audio clock fell behind", async () => {
      await scheduleCycleAlarms([{ typeId: "focus", date: NOW + 25 * MINUTE }]);
      // O relógio do áudio ficou parado (aba suspensa); só o do sistema andou
      jest.setSystemTime(NOW + 25 * MINUTE + 500);

      await playCycleSound("focus");

      expect(stopped()).toHaveLength(2);
      expect(oscillators).toHaveLength(4);
      expect(startedAt()[2]).toBeCloseTo(10.03, 3);
      expect(mockAudioContext.resume).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it("cancels and replays when AudioContext is suspended instead of running", async () => {
      await scheduleCycleAlarms([{ typeId: "focus", date: NOW + 25 * MINUTE }]);
      advance(25 * MINUTE + 500);
      mockAudioContext.state = "suspended";

      await playCycleSound("focus");

      expect(stopped()).toHaveLength(2);
      expect(oscillators).toHaveLength(4);
      expect(mockAudioContext.resume).toHaveBeenCalledTimes(1);
    });

    it("drops a tone whose time passed while the computer slept and stops reconciling when queue empties", async () => {
      await scheduleCycleAlarms([{ typeId: "focus", date: NOW + 25 * MINUTE }]);
      // Dormiu 40 min: o relógio do áudio não andou, o do sistema sim
      jest.setSystemTime(NOW + 40 * MINUTE);

      jest.advanceTimersByTime(15 * 1000);

      expect(stopped()).toHaveLength(2);
      expect(oscillators).toHaveLength(2);
      expect(jest.getTimerCount()).toBe(0);
    });

    it("reschedules a tone back to the right moment when audio clock drifts beyond 0.5s", async () => {
      await scheduleCycleAlarms([{ typeId: "focus", date: NOW + 25 * MINUTE }]);
      // Áudio parado por 10 min, sistema andou 10 min: faltam 15 min
      jest.setSystemTime(NOW + 10 * MINUTE);

      jest.advanceTimersByTime(15 * 1000);

      expect(stopped()).toHaveLength(2);
      expect(oscillators).toHaveLength(4);
      // advanceTimersByTime também andou 15 s no relógio do sistema
      expect(startedAt()[2]).toBeCloseTo(10 + 15 * 60 - 15, 3);
    });

    it("leaves on-time tones untouched during the periodic check", async () => {
      await scheduleCycleAlarms([{ typeId: "focus", date: NOW + 25 * MINUTE }]);

      mockAudioContext.currentTime += 15;
      jest.advanceTimersByTime(15 * 1000);

      expect(stopped()).toHaveLength(0);
      expect(oscillators).toHaveLength(2);
    });

    it("keeps already-rung alarms up to 10s so playCycleSound does not duplicate them, then purges them", async () => {
      await scheduleCycleAlarms([{ typeId: "focus", date: NOW + 10 * 1000 }]);

      // Avança 15 s (5 s após tocar no horário): reconciliação periódica dispara
      mockAudioContext.currentTime += 15;
      jest.advanceTimersByTime(15 * 1000);

      // Não deve reagendar nem parar um alarme que já tocou
      expect(stopped()).toHaveLength(0);
      expect(oscillators).toHaveLength(2);

      // Ainda dentro da janela de consulta do playCycleSound (5 s <= 6 s)
      await playCycleSound("focus");
      expect(oscillators).toHaveLength(2);

      // Após mais 15 s (20 s depois do fim > 10 s), o alarme é removido e o timer encerra
      mockAudioContext.currentTime += 15;
      jest.advanceTimersByTime(15 * 1000);
      expect(jest.getTimerCount()).toBe(0);
    });

    it("reconciles drift on document visibilitychange and cleans up listener and interval on cancel", async () => {
      await scheduleCycleAlarms([{ typeId: "focus", date: NOW + 25 * MINUTE }]);
      expect(documentListeners.visibilitychange).toEqual(expect.any(Function));

      jest.setSystemTime(NOW + 10 * MINUTE);
      documentListeners.visibilitychange();

      expect(stopped()).toHaveLength(2);
      expect(oscillators).toHaveLength(4);
      expect(startedAt()[2]).toBeCloseTo(10 + 15 * 60, 3);

      await cancelCycleAlarms();

      expect(jest.getTimerCount()).toBe(0);
      expect(documentListeners.visibilitychange).toBeUndefined();
      expect(globalThis.document.removeEventListener).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function),
      );
    });

    it("reconciles drift when AudioContext emits statechange", async () => {
      await scheduleCycleAlarms([{ typeId: "focus", date: NOW + 25 * MINUTE }]);
      expect(audioContextListeners.statechange).toEqual(expect.any(Function));

      jest.setSystemTime(NOW + 10 * MINUTE);
      audioContextListeners.statechange();

      expect(stopped()).toHaveLength(2);
      expect(oscillators).toHaveLength(4);
      expect(startedAt()[2]).toBeCloseTo(10 + 15 * 60, 3);
    });

    it("resolves safely without scheduling when AudioContext is unsupported", async () => {
      delete globalThis.AudioContext;

      await expect(
        scheduleCycleAlarms([{ typeId: "focus", date: NOW + 25 * MINUTE }]),
      ).resolves.toBeUndefined();
      expect(jest.getTimerCount()).toBe(0);
    });

    it("catches and logs a warning when scheduling fails", async () => {
      mockAudioContext.createOscillator.mockImplementationOnce(() => {
        throw new Error("Schedule error");
      });
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      await expect(
        scheduleCycleAlarms([{ typeId: "focus", date: NOW + 25 * MINUTE }]),
      ).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalledWith(
        "Não foi possível agendar o som do ciclo",
        expect.any(Error),
      );
    });
  });

  describe("releaseCycleSounds", () => {
    it("discards the AudioContext so a subsequent prepare creates a new one", async () => {
      await prepareCycleSounds();
      releaseCycleSounds();
      await prepareCycleSounds();

      expect(globalThis.AudioContext).toHaveBeenCalledTimes(2);
    });

    it("cancels scheduled alarms, stops reconciliation, and removes the statechange listener", async () => {
      const now = new Date("2026-11-16T12:00:00Z").getTime();
      jest.useFakeTimers({ now });
      try {
        await scheduleCycleAlarms([
          { typeId: "focus", date: now + 25 * 60 * 1000 },
        ]);

        releaseCycleSounds();

        expect(oscillators.every((o) => o.stop.mock.calls.length > 1)).toBe(
          true,
        );
        expect(jest.getTimerCount()).toBe(0);
        expect(documentListeners.visibilitychange).toBeUndefined();
        expect(audioContextListeners.statechange).toBeUndefined();
        expect(mockAudioContext.removeEventListener).toHaveBeenCalledWith(
          "statechange",
          expect.any(Function),
        );
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
