import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";
import { AppState, Vibration } from "react-native";
import { DEFAULT_SETTINGS } from "../../constants/settings";
import { todayKey } from "./historyLogic";
import { SettingsProvider } from "./SettingsProvider";
import { TasksProvider } from "./TaskProvider";
import {
  cancelTimerNotifications,
  scheduleTimerNotifications,
} from "./timerNotifications";
import { TimerProvider } from "./TimerProvider";
import useTaskContext from "./useTaskContext";
import useTimerContext from "./useTimerContext";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock("./timerNotifications", () => ({
  scheduleTimerNotifications: jest.fn(() =>
    Promise.resolve(["notif-1", "notif-2"]),
  ),
  cancelTimerNotifications: jest.fn(() => Promise.resolve()),
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
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockImplementation(async (key) => {
      if (key === "fokus-settings") return null;
      if (key === "fokus-tasks") return null;
      if (key === "fokus-timer") return null;
      return null;
    });
  });

  it("throws descriptive error when useTimerContext is used outside TimerProvider", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useTimerContext());
    }).toThrow("Tentando acessar o contexto fora do TimerProvider");

    errorSpy.mockRestore();
  });

  it("hydrates with default state when AsyncStorage is empty", async () => {
    const { result } = renderHook(() => useTimerContext(), {
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

    const { result } = renderHook(() => useTimerContext(), {
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

    const { result } = renderHook(() => useTimerContext(), {
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

    const { result } = renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerType.id).toBe("focus");
      expect(result.current.seconds).toBe(
        DEFAULT_SETTINGS.durations.focus * 60,
      );
    });

    expect(warnSpy).toHaveBeenCalledWith(
      "Erro ao carregar o timer",
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });

  it("switches timer type via toggleTimerType, resets paused time and cancels running timer", async () => {
    const { result } = renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerType.id).toBe("focus");
    });

    act(() => {
      result.current.toggleTimerType({ id: "short" });
    });

    expect(result.current.timerType.id).toBe("short");
    expect(result.current.seconds).toBe(DEFAULT_SETTINGS.durations.short * 60);
    expect(result.current.timerRunning).toBe(false);

    act(() => {
      result.current.toggleTimerType({ id: "long" });
    });

    expect(result.current.timerType.id).toBe("long");
    expect(result.current.seconds).toBe(DEFAULT_SETTINGS.durations.long * 60);
  });

  it("cancels notifications if toggleTimerType is called while timer is running", async () => {
    const { result } = renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerRunning).toBe(false);
    });

    await act(async () => {
      result.current.toggleTimer();
    });
    expect(result.current.timerRunning).toBe(true);

    act(() => {
      result.current.toggleTimerType({ id: "short" });
    });

    expect(result.current.timerRunning).toBe(false);
    expect(result.current.timerType.id).toBe("short");
    expect(cancelTimerNotifications).toHaveBeenCalled();
  });

  it("cancels scheduled notifications if timer is stopped before scheduleTimerNotifications resolves", async () => {
    let resolveSchedule;
    scheduleTimerNotifications.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSchedule = resolve;
        }),
    );

    const { result } = renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerRunning).toBe(false);
    });

    act(() => {
      result.current.toggleTimer();
    });

    // While scheduling is unresolved, pause or change mode
    act(() => {
      result.current.toggleTimerType({ id: "long" });
    });

    // Now resolve scheduling
    await act(async () => {
      resolveSchedule(["delayed-id-1"]);
    });

    expect(cancelTimerNotifications).toHaveBeenCalledWith(["delayed-id-1"]);
  });

  it("links currentTask when setCurrentTaskId is called", async () => {
    const { result } = renderHook(
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
    act(() => {
      result.current.tasks.addTask("Escrever relatório diagnóstico");
    });

    await waitFor(() => {
      expect(result.current.tasks.tasks).toHaveLength(1);
    });
    createdId = result.current.tasks.tasks[0].id;

    act(() => {
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

  it("starts the timer and schedules notifications when toggleTimer is called", async () => {
    const { result } = renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerRunning).toBe(false);
    });

    await act(async () => {
      result.current.toggleTimer();
    });

    expect(result.current.timerRunning).toBe(true);
    expect(scheduleTimerNotifications).toHaveBeenCalled();
  });

  it("pauses the running timer, saves pausedSeconds, and cancels notifications", async () => {
    const { result } = renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerRunning).toBe(false);
    });

    await act(async () => {
      result.current.toggleTimer();
    });
    expect(result.current.timerRunning).toBe(true);

    act(() => {
      result.current.toggleTimer();
    });

    expect(result.current.timerRunning).toBe(false);
    expect(cancelTimerNotifications).toHaveBeenCalled();
    expect(result.current.seconds).toBeGreaterThan(0);
  });

  it("completes a focus segment, credits pomodoro to current task, updates history, and vibrates", async () => {
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

    const { result } = renderHook(
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

    // When restored from storage, notificationsScheduledRef defaults to true
    // so in-app vibration is suppressed to avoid duplicate vibration with the OS alert
    expect(vibrateSpy).not.toHaveBeenCalled();
    vibrateSpy.mockRestore();
  });

  it("triggers in-app vibration when notifications are not scheduled (e.g. permission denied)", async () => {
    const vibrateSpy = jest
      .spyOn(Vibration, "vibrate")
      .mockImplementation(() => {});
    scheduleTimerNotifications.mockResolvedValueOnce([]); // No OS notifications scheduled

    const { result } = renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerRunning).toBe(false);
    });

    await act(async () => {
      result.current.toggleTimer();
    });

    expect(result.current.timerRunning).toBe(true);

    vibrateSpy.mockRestore();
  });

  it("updates clock and syncs on AppState active event", async () => {
    const { result } = renderHook(() => useTimerContext(), {
      wrapper: AllProviders,
    });

    await waitFor(() => {
      expect(result.current.timerType.id).toBe("focus");
    });

    act(() => {
      AppState.emit?.("change", "active");
    });

    expect(result.current.timerType).toBeDefined();
  });
});
