import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";
import { DEFAULT_SETTINGS } from "../../constants/settings";
import { SettingsProvider } from "./SettingsProvider";
import useSettingsContext from "./useSettingsContext";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(() => Promise.resolve()),
}));

describe("SettingsProvider & useSettingsContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws descriptive error when useSettingsContext is used outside SettingsProvider", async () => {
    // Suppress React error boundary console.error during expected throw
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(renderHook(() => useSettingsContext())).rejects.toThrow(
      "Tentando acessar o contexto fora do SettingsProvider",
    );

    errorSpy.mockRestore();
  });

  it("hydrates with DEFAULT_SETTINGS when AsyncStorage is empty", async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);

    const { result } = await renderHook(() => useSettingsContext(), {
      wrapper: ({ children }) => (
        <SettingsProvider>{children}</SettingsProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith("fokus-settings");
  });

  it("hydrates and normalizes saved settings from AsyncStorage", async () => {
    const saved = {
      autoStartCycles: false,
      vibrate: false,
      hasSeenWelcome: true,
      longBreakInterval: 2,
      durations: {
        focus: 45,
        short: 10,
        long: 25,
      },
    };
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(saved));

    const { result } = await renderHook(() => useSettingsContext(), {
      wrapper: ({ children }) => (
        <SettingsProvider>{children}</SettingsProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.settings.autoStartCycles).toBe(false);
    expect(result.current.settings.vibrate).toBe(false);
    expect(result.current.settings.hasSeenWelcome).toBe(true);
    expect(result.current.settings.longBreakInterval).toBe(2);
    expect(result.current.settings.durations.focus).toBe(45);
  });

  it("handles AsyncStorage.getItem errors defensively and still marks isLoaded", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    AsyncStorage.getItem.mockRejectedValueOnce(new Error("Disk error"));

    const { result } = await renderHook(() => useSettingsContext(), {
      wrapper: ({ children }) => (
        <SettingsProvider>{children}</SettingsProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(warnSpy).toHaveBeenCalledWith(
      "Erro ao carregar configurações",
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });

  it("respects the storage mount barrier and persists mutations only after isLoaded", async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);

    const { result } = await renderHook(() => useSettingsContext(), {
      wrapper: ({ children }) => (
        <SettingsProvider>{children}</SettingsProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    // Initial mount writes once isLoaded is true
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "fokus-settings",
      JSON.stringify(DEFAULT_SETTINGS),
    );
    AsyncStorage.setItem.mockClear();

    await act(() => {
      result.current.setAutoStartCycles(false);
    });

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "fokus-settings",
        expect.stringContaining('"autoStartCycles":false'),
      );
    });
  });

  it("updates vibrate, markWelcomeSeen, duration, and longBreakInterval correctly", async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);

    const { result } = await renderHook(() => useSettingsContext(), {
      wrapper: ({ children }) => (
        <SettingsProvider>{children}</SettingsProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(() => {
      result.current.setVibrate(false);
    });
    expect(result.current.settings.vibrate).toBe(false);

    await act(() => {
      result.current.markWelcomeSeen();
    });
    expect(result.current.settings.hasSeenWelcome).toBe(true);

    await act(() => {
      result.current.setDuration("focus", 50);
    });
    expect(result.current.settings.durations.focus).toBe(50);

    await act(() => {
      // Clamps to max 90 min per SETTINGS_LIMITS
      result.current.setDuration("focus", 999);
    });
    expect(result.current.settings.durations.focus).toBe(90);

    await act(() => {
      result.current.setLongBreakInterval(6);
    });
    expect(result.current.settings.longBreakInterval).toBe(6);

    await act(() => {
      // Clamps to max 8 per SETTINGS_LIMITS
      result.current.setLongBreakInterval(99);
    });
    expect(result.current.settings.longBreakInterval).toBe(8);

    await act(() => {
      // Clamps to min 2 per SETTINGS_LIMITS
      result.current.setLongBreakInterval(1);
    });
    expect(result.current.settings.longBreakInterval).toBe(2);
  });

  it("logs warning if AsyncStorage.setItem fails during persistence", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    AsyncStorage.setItem.mockRejectedValue(new Error("Write error"));

    const { result } = await renderHook(() => useSettingsContext(), {
      wrapper: ({ children }) => (
        <SettingsProvider>{children}</SettingsProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(() => {
      result.current.setVibrate(false);
    });

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        "Erro ao salvar configurações",
        expect.any(Error),
      );
    });

    warnSpy.mockRestore();
  });
});
