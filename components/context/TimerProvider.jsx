import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { pomodoro } from "../../constants/pomodoro";
import {
  cancelTimerNotification,
  scheduleTimerNotification,
} from "./timerNotifications";

export const TimerContext = createContext();

const TIMER_STORAGE_KEY = "fokus-timer";

const getRemainingSeconds = (endTime) =>
  Math.max(0, Math.ceil((endTime - Date.now()) / 1000));

export function TimerProvider({ children }) {
  const [timerType, setTimerType] = useState(pomodoro[0]);
  const [seconds, setSeconds] = useState(pomodoro[0].initialValue);
  // Horário (ms) em que o timer termina; null quando está pausado
  const [endTime, setEndTime] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const endTimeRef = useRef(null);
  const timerRunning = endTime != null;

  const updateEndTime = (value) => {
    endTimeRef.current = value;
    setEndTime(value);
  };

  useEffect(() => {
    const getData = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
        if (jsonValue != null) {
          const saved = JSON.parse(jsonValue);
          const savedType =
            pomodoro.find((p) => p.id === saved.timerTypeId) ?? pomodoro[0];
          setTimerType(savedType);

          if (saved.endTime && saved.endTime > Date.now()) {
            updateEndTime(saved.endTime);
          } else if (saved.endTime) {
            // Terminou enquanto o app estava fechado (a notificação já foi entregue)
            setSeconds(savedType.initialValue);
          } else {
            setSeconds(saved.seconds ?? savedType.initialValue);
          }
        }
      } catch (e) {
        console.warn("Erro ao carregar o timer", e);
      } finally {
        setIsLoaded(true);
      }
    };
    getData();
  }, []);

  // Enquanto roda, só muda quando pausa; evita gravar a cada segundo
  const pausedSeconds = timerRunning ? null : seconds;

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    const jsonValue = JSON.stringify({
      timerTypeId: timerType.id,
      endTime,
      seconds: pausedSeconds,
    });
    AsyncStorage.setItem(TIMER_STORAGE_KEY, jsonValue).catch((e) =>
      console.warn("Erro ao salvar o timer", e),
    );
  }, [timerType, endTime, pausedSeconds, isLoaded]);

  // O tempo restante é calculado a partir do horário de término, então continua
  // certo mesmo que o JS fique parado com a tela bloqueada ou o app em segundo plano
  useEffect(() => {
    if (endTime == null) {
      return;
    }

    const tick = () => {
      const remaining = getRemainingSeconds(endTime);
      if (remaining === 0) {
        updateEndTime(null);
        setSeconds(timerType.initialValue);
        return;
      }
      setSeconds(remaining);
    };

    tick();
    const intervalId = setInterval(tick, 250);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        tick();
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [endTime, timerType]);

  const startTimer = async () => {
    const newEndTime = Date.now() + seconds * 1000;
    updateEndTime(newEndTime);

    const notificationId = await scheduleTimerNotification(
      timerType,
      newEndTime,
    );
    // Pausou ou trocou de modo enquanto a notificação era agendada
    if (endTimeRef.current !== newEndTime) {
      await cancelTimerNotification(notificationId);
    }
  };

  const pauseTimer = () => {
    setSeconds(getRemainingSeconds(endTime));
    updateEndTime(null);
    cancelTimerNotification();
  };

  const toggleTimer = () => {
    if (timerRunning) {
      pauseTimer();
      return;
    }
    startTimer();
  };

  const toggleTimerType = (newTimerType) => {
    if (timerRunning) {
      cancelTimerNotification();
    }
    updateEndTime(null);
    setTimerType(newTimerType);
    setSeconds(newTimerType.initialValue);
  };

  return (
    <TimerContext.Provider
      value={{
        timerType,
        seconds,
        timerRunning,
        toggleTimer,
        toggleTimerType,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}
