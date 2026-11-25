import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState, Platform, Vibration } from "react-native";
import { DEFAULT_SETTINGS } from "../../constants/settings";
import {
  cancelCycleAlarms,
  playCycleSound,
  prepareCycleSounds,
  releaseCycleSounds,
  scheduleCycleAlarms,
} from "../../services/audioService";
import { todayKey } from "./historyLogic";
import { SettingsProvider } from "./SettingsProvider";
import { TasksProvider } from "./TaskProvider";
import {
  cancelTimerNotifications,
  dismissOngoingNotification,
  scheduleTimerNotifications,
  showOngoingNotification,
  VIBRATION_PATTERN,
} from "./timerNotifications";
import { TimerProvider } from "./TimerProvider";
import useTaskContext from "./useTaskContext";
import useTimerContext from "./useTimerContext";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock("../../services/audioService", () => ({
  prepareCycleSounds: jest.fn(() => Promise.resolve()),
  playCycleSound: jest.fn(() => Promise.resolve()),
  scheduleCycleAlarms: jest.fn(() => Promise.resolve()),
  cancelCycleAlarms: jest.fn(() => Promise.resolve()),
  releaseCycleSounds: jest.fn(),
}));

jest.mock("./timerNotifications", () => ({
  scheduleTimerNotifications: jest.fn(() =>
    Promise.resolve(["notif-1", "notif-2"]),
  ),
  cancelTimerNotifications: jest.fn(() => Promise.resolve()),
  showOngoingNotification: jest.fn(() => Promise.resolve()),
  dismissOngoingNotification: jest.fn(() => Promise.resolve()),
  VIBRATION_PATTERN: [0, 400, 200, 400],
}));

function AllProviders({ children }) {
  return (
    <SettingsProvider>
      <TasksProvider>
        <TimerProvider>{children}</TimerProvider>
      </TasksProvider>
    </SettingsProvider>
  );
}

describe("TimerProvider & useTimerContext", () => {
  const originalAppState = AppState.currentState;
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    AppState.currentState = "active";
    Platform.OS = originalPlatform;
    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === "fokus-settings") return null;
      if (key === "fokus-tasks") return null;
      if (key === "fokus-timer") return null;
      return null;
    });
  });

  afterEach(() => {
    AppState.currentState = originalAppState;
    Platform.OS = originalPlatform;
  });

  it("throws descriptive error when useTimerContext is used outside TimerProvider", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(renderHook(() => useTimerContext())).rejects.toThrow(
      "Tentando acessar o contexto fora do TimerProvider",
    );

    errorSpy.mockRestore();
  });

  it("hydrates with default state when AsyncStorage is empty", async () => {
    const { result } = await renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerType.id).toBe("focus");
      expect(result.current.seconds).toBe(
        DEFAULT_SETTINGS.durations.focus * 60,
      );
      expect(result.current.timerRunning).toBe(false);
      expect(result.current.todayCount).toBe(0);
      expect(result.current.currentTask).toBeNull();
    });

    expect(AsyncStorage.getItem).toHaveBeenCalledWith("fokus-timer");
  });

  it("hydrates saved timer state with pausedSeconds, history, and currentTaskId", async () => {
    const savedTimer = {
      typeId: "short",
      pausedSeconds: 180,
      history: {
        [todayKey(Date.now())]: { count: 3, minutes: 75 },
      },
      currentTaskId: "task-123",
    };
    const savedTasks = [
      { id: "task-123", description: "Tarefa ativa", pomodoros: 2 },
    ];

    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === "fokus-timer") return JSON.stringify(savedTimer);
      if (key === "fokus-tasks") return JSON.stringify(savedTasks);
      return null;
    });

    const { result } = await renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerType.id).toBe("short");
      expect(result.current.seconds).toBe(180);
      expect(result.current.timerRunning).toBe(false);
      expect(result.current.todayCount).toBe(3);
      expect(result.current.currentTask).toEqual(
        expect.objectContaining({
          id: "task-123",
          description: "Tarefa ativa",
        }),
      );
    });
  });

  it("migrates legacy stats schema and legacy single endTime cleanly", async () => {
    const now = Date.now();
    const legacyTimer = {
      timerTypeId: "focus",
      endTime: now + 500000,
      stats: {
        date: todayKey(now),
        count: 2,
      },
    };

    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === "fokus-timer") return JSON.stringify(legacyTimer);
      return null;
    });

    const { result } = await renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerType.id).toBe("focus");
      expect(result.current.timerRunning).toBe(true);
      expect(result.current.todayCount).toBe(2);
    });
  });

  it("handles storage read failure defensively and still recovers", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === "fokus-timer") throw new Error("Disk corruption");
      return null;
    });

    const { result } = await renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerType.id).toBe("focus");
      expect(result.current.seconds).toBe(
        DEFAULT_SETTINGS.durations.focus * 60,
      );
    });

    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
      "fokus-timer",
      expect.anything(),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      "Erro ao carregar o timer",
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });

  it("calls playCycleSound even when distinctSounds is false", async () => {
    const now = Date.now();
    const pastSegmentTimer = {
      typeId: "focus",
      segments: [
        { typeId: "focus", startTime: now - 1500000, endTime: now - 100 },
      ],
      processed: 0,
      currentTaskId: null,
    };
    const settingsWithoutDistinct = {
      ...DEFAULT_SETTINGS,
      distinctSounds: false,
    };

    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === "fokus-timer") return JSON.stringify(pastSegmentTimer);
      if (key === "fokus-settings")
        return JSON.stringify(settingsWithoutDistinct);
      return null;
    });

    await renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(
      () => {
        expect(playCycleSound).toHaveBeenCalledWith("focus", {
          distinctSounds: false,
        });
      },
      { timeout: 2000 },
    );
  });

  it("switches timer type via toggleTimerType, resets paused time and cancels running timer", async () => {
    const { result } = await renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerType.id).toBe("focus");
    });

    await act(() => {
      result.current.toggleTimerType({ id: "short" });
    });

    expect(result.current.timerType.id).toBe("short");
    expect(result.current.seconds).toBe(DEFAULT_SETTINGS.durations.short * 60);
    expect(result.current.timerRunning).toBe(false);

    await act(() => {
      result.current.toggleTimerType({ id: "long" });
    });

    expect(result.current.timerType.id).toBe("long");
    expect(result.current.seconds).toBe(DEFAULT_SETTINGS.durations.long * 60);
  });

  // Na web o som de fim de ciclo toca mesmo sem sons distintos, e o navegador só
  // libera o áudio dentro de um toque do usuário: o Play precisa sempre prepará-lo
  it("prepares the cycle sound on play even when distinctSounds is false", async () => {
    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === "fokus-settings")
        return JSON.stringify({ ...DEFAULT_SETTINGS, distinctSounds: false });
      return null;
    });

    const { result } = await renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });
    await waitFor(() => {
      expect(result.current.timerRunning).toBe(false);
    });

    await act(async () => {
      result.current.toggleTimer();
    });

    expect(result.current.timerRunning).toBe(true);
    expect(prepareCycleSounds).toHaveBeenCalledTimes(1);
    expect(scheduleCycleAlarms).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          typeId: "focus",
          date: expect.any(Number),
        }),
      ]),
      { distinctSounds: false },
    );
  });

  it("cancels notifications and cycle alarms if toggleTimerType is called while timer is running", async () => {
    const { result } = await renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerRunning).toBe(false);
    });

    await act(async () => {
      result.current.toggleTimer();
    });
    expect(result.current.timerRunning).toBe(true);

    await act(() => {
      result.current.toggleTimerType({ id: "short" });
    });

    expect(result.current.timerRunning).toBe(false);
    expect(result.current.timerType.id).toBe("short");
    expect(cancelCycleAlarms).toHaveBeenCalled();
    expect(cancelTimerNotifications).toHaveBeenCalled();
  });

  it("cancels scheduled notifications and cycle alarms if timer is stopped before scheduleTimerNotifications resolves", async () => {
    let resolveSchedule;
    scheduleTimerNotifications.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSchedule = resolve;
        }),
    );

    const { result } = await renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerRunning).toBe(false);
    });

    await act(() => {
      result.current.toggleTimer();
    });

    // While scheduling is unresolved, pause or change mode
    await act(() => {
      result.current.toggleTimerType({ id: "long" });
    });

    cancelCycleAlarms.mockClear();

    // Now resolve scheduling
    await act(async () => {
      resolveSchedule(["delayed-id-1"]);
    });

    expect(cancelCycleAlarms).toHaveBeenCalledTimes(1);
    expect(cancelTimerNotifications).toHaveBeenCalledWith(
      ["delayed-id-1"],
      undefined,
    );
  });

  it("dismisses ongoing notification even if paused before showOngoingNotification resolves", async () => {
    let resolveOngoing;
    let resolveSchedule;
    showOngoingNotification.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOngoing = resolve;
        }),
    );
    scheduleTimerNotifications.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSchedule = resolve;
        }),
    );

    const { result } = await renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerRunning).toBe(false);
    });

    await act(() => {
      result.current.toggleTimer();
    });
    await act(() => {
      result.current.toggleTimer();
    });

    dismissOngoingNotification.mockClear();
    cancelTimerNotifications.mockClear();

    await act(async () => {
      resolveSchedule(["late-id"]);
      resolveOngoing();
    });

    expect(cancelTimerNotifications).toHaveBeenCalledWith(
      ["late-id"],
      undefined,
    );
  });

  it("updates ongoing notification when continuous cycles advance in foreground", async () => {
    const now = Date.now();
    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === "fokus-timer") {
        return JSON.stringify({
          typeId: "focus",
          segments: [
            { typeId: "focus", startTime: now - 1500000, endTime: now - 100 },
            { typeId: "short", startTime: now - 100, endTime: now + 300000 },
          ],
          processed: 0,
        });
      }
      return null;
    });

    const { result } = await renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerType.id).toBe("short");
      expect(showOngoingNotification).toHaveBeenCalledWith({
        typeLabel: "Pausa curta",
        endTime: now + 300000,
      });
    });
  });

  it("clears orphaned currentTaskId when the selected task is deleted", async () => {
    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === "fokus-timer") {
        return JSON.stringify({ currentTaskId: "task-1" });
      }
      if (key === "fokus-tasks") {
        return JSON.stringify([{ id: "task-1", description: "Temporária" }]);
      }
      return null;
    });

    const { result } = await renderHook(
      () => ({
        timer: useTimerContext(),
        tasks: useTaskContext(),
      }),
      { wrapper: AllProviders },
    );

    await waitFor(() => {
      expect(result.current.timer.currentTask?.id).toBe("task-1");
    });

    await act(() => {
      result.current.tasks.deleteTask("task-1");
    });

    await waitFor(() => {
      expect(result.current.timer.currentTask).toBeNull();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "fokus-timer",
        expect.stringContaining('"currentTaskId":null'),
      );
    });
  });

  it("links currentTask when setCurrentTaskId is called", async () => {
    const { result } = await renderHook(
      () => ({
        timer: useTimerContext(),
        tasks: useTaskContext(),
      }),
      { wrapper: AllProviders },
    );

    await waitFor(() => {
      expect(result.current.timer.timerType.id).toBe("focus");
    });

    let createdId;
    await act(() => {
      result.current.tasks.addTask("Escrever relatório diagnóstico");
    });

    await waitFor(() => {
      expect(result.current.tasks.tasks).toHaveLength(1);
    });
    createdId = result.current.tasks.tasks[0].id;

    await act(() => {
      result.current.timer.setCurrentTaskId(createdId);
    });

    await waitFor(() => {
      expect(result.current.timer.currentTask).toEqual(
        expect.objectContaining({
          id: createdId,
          description: "Escrever relatório diagnóstico",
        }),
      );
    });
  });

  it("starts the timer, prepares audio, and schedules notifications and cycle alarms when toggleTimer is called", async () => {
    const { result } = await renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerRunning).toBe(false);
    });

    await act(async () => {
      result.current.toggleTimer();
    });

    expect(result.current.timerRunning).toBe(true);
    expect(prepareCycleSounds).toHaveBeenCalledTimes(1);
    expect(scheduleCycleAlarms).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          typeId: "focus",
          date: expect.any(Number),
        }),
      ]),
      { distinctSounds: DEFAULT_SETTINGS.distinctSounds },
    );
    expect(scheduleTimerNotifications).toHaveBeenCalled();
  });

  it("pauses the running timer, saves pausedSeconds, and cancels notifications and cycle alarms", async () => {
    const { result } = await renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerRunning).toBe(false);
    });

    await act(async () => {
      result.current.toggleTimer();
    });
    expect(result.current.timerRunning).toBe(true);

    await act(() => {
      result.current.toggleTimer();
    });

    expect(result.current.timerRunning).toBe(false);
    expect(cancelCycleAlarms).toHaveBeenCalled();
    expect(cancelTimerNotifications).toHaveBeenCalled();
    expect(result.current.seconds).toBeGreaterThan(0);
  });

  it("completes a focus segment in foreground, credits pomodoro, updates history, plays sound, and vibrates", async () => {
    const vibrateSpy = jest
      .spyOn(Vibration, "vibrate")
      .mockImplementation(() => {});
    const now = Date.now();
    // Pre-seed a running timer that has 1 focus segment ending right now
    const pastSegmentTimer = {
      typeId: "focus",
      segments: [
        { typeId: "focus", startTime: now - 1500000, endTime: now - 100 },
      ],
      processed: 0,
      currentTaskId: "task-credit-id",
    };
    const initialTasks = [
      { id: "task-credit-id", description: "Tarefa foco", pomodoros: 0 },
    ];

    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === "fokus-timer") return JSON.stringify(pastSegmentTimer);
      if (key === "fokus-tasks") return JSON.stringify(initialTasks);
      return null;
    });

    const { result } = await renderHook(
      () => ({
        timer: useTimerContext(),
        tasks: useTaskContext(),
      }),
      { wrapper: AllProviders },
    );

    // Wait for the tick reconciliation to process the elapsed segment
    await waitFor(
      () => {
        expect(result.current.tasks.tasks[0].pomodoros).toBe(1);
        expect(result.current.timer.todayCount).toBe(1);
        expect(result.current.timer.timerRunning).toBe(false);
        // Next phase after 1st focus is short break
        expect(result.current.timer.timerType.id).toBe("short");
      },
      { timeout: 2000 },
    );

    // Foreground notifications are silenced by setNotificationHandler, so the app plays
    // audio via audioService and triggers vibration directly when AppState is active
    expect(playCycleSound).toHaveBeenCalledWith("focus", {
      distinctSounds: DEFAULT_SETTINGS.distinctSounds,
    });
    expect(vibrateSpy).toHaveBeenCalledWith(VIBRATION_PATTERN);
    vibrateSpy.mockRestore();
  });

  it.each([
    {
      label: "ios with scheduled OS notifications",
      os: "ios",
      scheduledIds: ["scheduled-os-notif"],
    },
    {
      label: "android with scheduled OS notifications",
      os: "android",
      scheduledIds: ["scheduled-os-notif"],
    },
    {
      label: "ios when OS notification permission is denied",
      os: "ios",
      scheduledIds: [],
    },
  ])(
    "triggers in-app vibration and sound in foreground ($label)",
    async ({ os, scheduledIds }) => {
      Platform.OS = os;
      AppState.currentState = "active";
      const vibrateSpy = jest
        .spyOn(Vibration, "vibrate")
        .mockImplementation(() => {});
      scheduleTimerNotifications.mockResolvedValueOnce(scheduledIds);

      AsyncStorage.getItem.mockImplementation(async (key) => {
        if (key === "fokus-timer")
          return JSON.stringify({ typeId: "focus", pausedSeconds: 1 });
        if (key === "fokus-settings")
          return JSON.stringify({
            ...DEFAULT_SETTINGS,
            autoStartCycles: false,
            vibrate: true,
          });
        return null;
      });

      const { result } = await renderHook(() => useTimerContext(), {
        wrapper: AllProviders,
      });

      await waitFor(() => {
        expect(result.current.timerRunning).toBe(false);
        expect(result.current.seconds).toBe(1);
      });

      jest.useFakeTimers();
      try {
        await act(async () => {
          result.current.toggleTimer();
        });
        expect(result.current.timerRunning).toBe(true);

        await act(async () => {
          jest.advanceTimersByTime(1200);
        });

        expect(result.current.timerRunning).toBe(false);
        expect(result.current.timerType.id).toBe("short");
        expect(playCycleSound).toHaveBeenCalledWith("focus", {
          distinctSounds: DEFAULT_SETTINGS.distinctSounds,
        });
        expect(vibrateSpy).toHaveBeenCalledWith(VIBRATION_PATTERN);
      } finally {
        jest.useRealTimers();
        vibrateSpy.mockRestore();
      }
    },
  );

  it("reconciles completed cycle if paused right after endTime before the next tick", async () => {
    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === "fokus-timer") {
        return JSON.stringify({
          typeId: "focus",
          pausedSeconds: 1,
          currentTaskId: 77,
        });
      }
      if (key === "fokus-tasks") {
        return JSON.stringify([
          { id: 77, description: "Tarefa legada", pomodoros: 0 },
        ]);
      }
      if (key === "fokus-settings") {
        return JSON.stringify({ ...DEFAULT_SETTINGS, autoStartCycles: false });
      }
      return null;
    });

    const { result } = await renderHook(
      () => ({
        timer: useTimerContext(),
        tasks: useTaskContext(),
      }),
      { wrapper: AllProviders },
    );

    await waitFor(() => {
      expect(result.current.timer.seconds).toBe(1);
      expect(result.current.timer.currentTask?.id).toBe("77");
    });

    jest.useFakeTimers();
    try {
      const startTime = Date.now();
      await act(async () => {
        result.current.timer.toggleTimer();
      });
      expect(result.current.timer.timerRunning).toBe(true);

      jest.setSystemTime(startTime + 1200);
      await act(() => {
        result.current.timer.toggleTimer();
      });

      expect(result.current.timer.timerRunning).toBe(false);
      expect(result.current.timer.timerType.id).toBe("short");
      expect(result.current.timer.seconds).toBe(
        DEFAULT_SETTINGS.durations.short * 60,
      );
      expect(result.current.timer.todayCount).toBe(1);
      expect(result.current.tasks.tasks[0].pomodoros).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("ignores malformed history/segments and coerces numeric currentTaskId on hydration", async () => {
    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === "fokus-timer") {
        return JSON.stringify({
          typeId: "focus",
          pausedSeconds: -10,
          history: "corrupted",
          currentTaskId: 99,
          segments: [null, { typeId: "focus", endTime: "bad" }],
        });
      }
      if (key === "fokus-tasks") {
        return JSON.stringify([{ id: 99, description: "Numérica" }]);
      }
      return null;
    });

    const { result } = await renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.currentTask?.id).toBe("99");
      expect(result.current.todayCount).toBe(0);
      expect(result.current.timerRunning).toBe(false);
      expect(result.current.seconds).toBe(
        DEFAULT_SETTINGS.durations.focus * 60,
      );
    });
  });

  it("does not play foreground sound or vibrate when AppState is in background", async () => {
    AppState.currentState = "background";
    const vibrateSpy = jest
      .spyOn(Vibration, "vibrate")
      .mockImplementation(() => {});
    const now = Date.now();
    const pastSegmentTimer = {
      typeId: "focus",
      segments: [
        { typeId: "focus", startTime: now - 1500000, endTime: now - 100 },
      ],
      processed: 0,
      currentTaskId: null,
    };

    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === "fokus-timer") return JSON.stringify(pastSegmentTimer);
      return null;
    });

    const { result } = await renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(
      () => {
        expect(result.current.todayCount).toBe(1);
        expect(result.current.timerRunning).toBe(false);
        expect(result.current.timerType.id).toBe("short");
      },
      { timeout: 2000 },
    );

    expect(playCycleSound).not.toHaveBeenCalled();
    expect(vibrateSpy).not.toHaveBeenCalled();
    vibrateSpy.mockRestore();
  });

  it("releases cycle sounds when TimerProvider unmounts", async () => {
    const { result, unmount } = await renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerType.id).toBe("focus");
    });

    expect(releaseCycleSounds).not.toHaveBeenCalled();

    await act(() => {
      unmount();
    });

    expect(releaseCycleSounds).toHaveBeenCalledTimes(1);
  });

  it("updates clock and syncs on AppState active event", async () => {
    const { result } = await renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerType.id).toBe("focus");
    });

    await act(() => {
      AppState.emit?.("change", "active");
    });

    expect(result.current.timerType).toBeDefined();
  });

  it("recovers to default state when stored timer JSON is malformed", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === "fokus-timer") return "{corrupted-json";
      return null;
    });

    const { result } = await renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        "Estado do timer inválido, usando padrão",
        expect.any(Error),
      );
      expect(result.current.timerType.id).toBe("focus");
      expect(result.current.timerRunning).toBe(false);
    });
    warnSpy.mockRestore();
  });
});
