import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useEffect, useState } from "react";
import { DEFAULT_SETTINGS } from "../../constants/settings";
import { normalizeSettings } from "./timerLogic";

export const SettingsContext = createContext();

const SETTINGS_STORAGE_KEY = "fokus-settings";

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const getData = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (jsonValue != null) {
          setSettings(normalizeSettings(JSON.parse(jsonValue)));
        }
      } catch (e) {
        console.warn("Erro ao carregar configurações", e);
      } finally {
        setIsLoaded(true);
      }
    };
    getData();
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings)).catch(
      (e) => console.warn("Erro ao salvar configurações", e),
    );
  }, [settings, isLoaded]);

  const setAutoStartCycles = (autoStartCycles) => {
    setSettings((oldState) => ({ ...oldState, autoStartCycles }));
  };

  const setDuration = (typeId, minutes) => {
    setSettings((oldState) =>
      normalizeSettings({
        ...oldState,
        durations: { ...oldState.durations, [typeId]: minutes },
      }),
    );
  };

  const setLongBreakInterval = (longBreakInterval) => {
    setSettings((oldState) =>
      normalizeSettings({ ...oldState, longBreakInterval }),
    );
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoaded,
        setAutoStartCycles,
        setDuration,
        setLongBreakInterval,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}
