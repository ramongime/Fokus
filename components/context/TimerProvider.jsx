import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useEffect, useRef, useState } from "react";
import { AppState, Vibration } from "react-native";
import {
  addFocusCompletions,
  buildPlan,
  countFinishedSegments,
  getDurationSeconds,
  getNextTypeId,
  getRemainingSeconds,
  getSegmentNotification,
  getTodayCount,
  getTypeById,
  shouldVibrateInApp,
} from "./timerLogic";
import {
  cancelTimerNotifications,
  scheduleTimerNotifications,
  VIBRATION_PATTERN,
} from "./timerNotifications";
import useSettingsContext from "./useSettingsContext";
import useTaskContext from "./useTaskContext";

/*
 * Estado do timer Pomodoro.
 *
 * Em vez de um contador que diminui a cada segundo, o timer guarda o horário em que cada
 * ciclo termina (`segments`). O tempo na tela é sempre "término - agora". Assim, se o
 * celular bloquear e o JavaScript ficar congelado, ao voltar o valor já está certo.
 *
 * Fluxo:
 *   play   -> buildPlan monta os ciclos e agenda uma notificação para o fim de cada um
 *   tick   -> descobre em qual ciclo estamos, contabiliza os que terminaram e atualiza a tela
 *   pausa  -> guarda o tempo restante e cancela as notificações
 *   fim    -> para no próximo modo sugerido (pausa curta, longa ou foco)
 */
export const TimerContext = createContext();

const TIMER_STORAGE_KEY = "fokus-timer";

export function TimerProvider({ children }) {
  const { settings, isLoaded: settingsLoaded } = useSettingsContext();
  const { tasks, isLoaded: tasksLoaded, addPomodorosToTask } = useTaskContext();

  const [typeId, setTypeId] = useState("focus");
  // Tempo restante de um ciclo pausado no meio; null = duração cheia do modo
  const [pausedSeconds, setPausedSeconds] = useState(null);
  // Ciclos planejados enquanto o timer roda: [{ typeId, endTime }]; null = parado
  const [segments, setSegments] = useState(null);
  // Quantos ciclos do plano já terminaram e foram contabilizados
  const [processed, setProcessed] = useState(0);
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [stats, setStats] = useState({ date: null, count: 0 });
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  // Atualizado a cada minuto para o contador do dia virar à meia-noite
  const [clock, setClock] = useState(Date.now());

  // Cópias em ref para o tick ler o valor mais recente sem esperar um novo render.
  // Evita contar o mesmo ciclo duas vezes se dois ticks rodarem seguidos.
  const segmentsRef = useRef(null);
  const processedRef = useRef(0);
  // Se há notificações agendadas para este plano, elas já vibram; o app não vibra junto.
  // Começa true para um plano restaurado ao abrir o app, que teve notificações agendadas.
  const notificationsScheduledRef = useRef(true);

  // Atualiza o plano e o state juntos, para ref e state nunca ficarem diferentes
  const updateRun = (newSegments, newProcessed) => {
    segmentsRef.current = newSegments;
    processedRef.current = newProcessed;
    setSegments(newSegments);
    setProcessed(newProcessed);
  };

  // Valores derivados: calculados a cada render, não guardados
  const timerRunning = segments != null;
  const timerType = getTypeById(typeId);
  const seconds = timerRunning
    ? liveSeconds
    : (pausedSeconds ?? getDurationSeconds(typeId, settings));
  const todayCount = getTodayCount(stats, clock);
  const currentTask = tasks.find((t) => t.id === currentTaskId) ?? null;
  // Só processa ciclos depois de tudo carregado, senão os pomodoros somados numa tarefa
  // seriam sobrescritos quando a lista de tarefas terminasse de carregar
  const ready = isLoaded && settingsLoaded && tasksLoaded;

  // Carrega o estado salvo ao abrir o app

  useEffect(() => {
    const getData = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
        if (jsonValue != null) {
          const saved = JSON.parse(jsonValue);
          // timerTypeId, seconds e endTime vêm da versão anterior do timer
          const savedTypeId = getTypeById(saved.typeId ?? saved.timerTypeId).id;
          setTypeId(savedTypeId);
          setPausedSeconds(saved.pausedSeconds ?? saved.seconds ?? null);
          setStats(saved.stats ?? { date: null, count: 0 });
          setCurrentTaskId(saved.currentTaskId ?? null);
          if (Array.isArray(saved.segments) && saved.segments.length) {
            updateRun(saved.segments, saved.processed ?? 0);
          } else if (saved.endTime) {
            updateRun([{ typeId: savedTypeId, endTime: saved.endTime }], 0);
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

  // Força um render por minuto e ao voltar para o app, para o "focos hoje" virar o dia
  useEffect(() => {
    const updateClock = () => setClock(Date.now());
    const intervalId = setInterval(updateClock, 60 * 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        updateClock();
      }
    });
    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, []);

  // Salva sempre que algo relevante muda (o tempo ao vivo não precisa ser salvo)
  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    const jsonValue = JSON.stringify({
      typeId,
      pausedSeconds,
      segments,
      processed,
      stats,
      currentTaskId,
    });
    AsyncStorage.setItem(TIMER_STORAGE_KEY, jsonValue).catch((e) =>
      console.warn("Erro ao salvar o timer", e),
    );
  }, [
    typeId,
    pausedSeconds,
    segments,
    processed,
    stats,
    currentTaskId,
    isLoaded,
  ]);

  // O tempo vem do horário de término de cada ciclo, então continua certo mesmo
  // que o JS fique parado com a tela bloqueada ou o app fechado
  useEffect(() => {
    if (!ready || segments == null) {
      return;
    }

    // Roda 4x por segundo e sempre que o app volta para primeiro plano
    const tick = () => {
      const plan = segmentsRef.current;
      if (plan == null) {
        return;
      }
      const now = Date.now();
      const finished = countFinishedSegments(plan, now);
      let count = getTodayCount(stats, now);

      // Ciclos que terminaram desde o último tick: soma os focos no dia e na tarefa
      if (finished > processedRef.current) {
        const finishedSegments = plan.slice(processedRef.current, finished);
        const focusDone = finishedSegments.filter(
          (s) => s.typeId === "focus",
        ).length;
        if (
          shouldVibrateInApp({
            finishedSegments,
            now,
            settings,
            appActive: AppState.currentState === "active",
            notificationsScheduled: notificationsScheduledRef.current,
          })
        ) {
          Vibration.vibrate(VIBRATION_PATTERN);
        }
        processedRef.current = finished;
        setProcessed(finished);
        if (focusDone > 0) {
          count += focusDone;
          setStats((oldState) => addFocusCompletions(oldState, focusDone, now));
          setClock(now);
          if (currentTaskId) {
            addPomodorosToTask(currentTaskId, focusDone);
          }
        }
      }

      if (finished >= plan.length) {
        // Acabou o que foi planejado: para no próximo modo sugerido
        const last = plan[plan.length - 1];
        updateRun(null, 0);
        setTypeId(getNextTypeId(last.typeId, count, settings));
        setPausedSeconds(null);
        return;
      }

      // Ainda há ciclo em andamento: mostra o modo e o tempo restante dele
      const current = plan[finished];
      setTypeId(current.typeId);
      setLiveSeconds(getRemainingSeconds(current.endTime, now));
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
  }, [ready, segments, stats, settings, currentTaskId, addPomodorosToTask]);

  // Play: planeja os ciclos a partir do tempo atual e agenda as notificações
  const startTimer = async () => {
    const plan = buildPlan({
      typeId,
      seconds,
      now: Date.now(),
      focusCount: todayCount,
      settings,
    });
    updateRun(plan, 0);
    setLiveSeconds(seconds);
    notificationsScheduledRef.current = false;

    const ids = await scheduleTimerNotifications(
      plan.map((segment, index) => ({
        ...getSegmentNotification(plan, index, settings, currentTask),
        date: segment.endTime,
      })),
      { vibrate: settings.vibrate },
    );
    // Pausou ou trocou de modo enquanto as notificações eram agendadas
    if (segmentsRef.current !== plan) {
      await cancelTimerNotifications(ids);
      return;
    }
    notificationsScheduledRef.current = ids.length > 0;
  };

  // Pausa: guarda quanto faltava no ciclo atual e cancela os avisos
  const pauseTimer = () => {
    const plan = segmentsRef.current;
    const now = Date.now();
    const current =
      plan[Math.min(countFinishedSegments(plan, now), plan.length - 1)];
    setTypeId(current.typeId);
    setPausedSeconds(getRemainingSeconds(current.endTime, now));
    updateRun(null, 0);
    cancelTimerNotifications();
  };

  const toggleTimer = () => {
    if (timerRunning) {
      pauseTimer();
      return;
    }
    startTimer();
  };

  // Trocar de modo manualmente sempre para o timer e começa com a duração cheia
  const toggleTimerType = (newTimerType) => {
    if (timerRunning) {
      cancelTimerNotifications();
    }
    updateRun(null, 0);
    setTypeId(newTimerType.id);
    setPausedSeconds(null);
  };

  return (
    <TimerContext.Provider
      value={{
        timerType,
        seconds,
        timerRunning,
        todayCount,
        currentTask,
        setCurrentTaskId,
        toggleTimer,
        toggleTimerType,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}
