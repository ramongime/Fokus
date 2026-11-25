import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Vibration } from "react-native";
import { DEFAULT_SETTINGS } from "../../constants/settings";
import {
  cancelCycleAlarms,
  playCycleSound,
  prepareCycleSounds,
  releaseCycleSounds,
  scheduleCycleAlarms,
} from "../../services/audioService";
import {
  addFocusSessions,
  getTodayCount,
  historyFromLegacyStats,
  mergeHistory,
  normalizeHistory,
} from "./historyLogic";
import {
  addFocusToSeries,
  buildPlan,
  countFinishedSegments,
  getDurationSeconds,
  getForegroundAlertSegment,
  getNextTypeId,
  getRemainingSeconds,
  getSegmentMinutes,
  getSeriesCount,
  getSegmentNotification,
  getTypeById,
  normalizeSavedSegments,
  normalizeSeries,
  shouldVibrateInApp,
} from "./timerLogic";
import {
  cancelTimerNotifications,
  dismissOngoingNotification,
  scheduleTimerNotifications,
  showOngoingNotification,
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
 *   play   -> buildPlan monta os ciclos, prepara o áudio e agenda notificações/alarmes
 *   tick   -> descobre em qual ciclo estamos, contabiliza os que terminaram e atualiza a tela
 *   pausa  -> guarda o tempo restante e cancela as notificações e alarmes de áudio
 *   fim    -> para no próximo modo sugerido (pausa curta, longa ou foco)
 */
export const TimerContext = createContext();
// O tempo restante muda a cada segundo; fica num contexto separado para que só quem
// mostra o relógio (tela do timer) renderize a cada segundo, e não o menu ou o histórico
export const TimerSecondsContext = createContext(null);

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
  // Focos por dia: { "2026-09-26": { count, minutes } }
  const [history, setHistory] = useState({});
  // Série de focos até a pausa longa: { count, lastEndTime }; atravessa a meia-noite
  // se você está focando nela. null = ainda não registrada (usa os focos de hoje)
  const [series, setSeries] = useState(null);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  // Atualizado a cada minuto para o contador do dia virar à meia-noite
  const [clock, setClock] = useState(() => Date.now());

  // Cópias em ref para o tick ler o valor mais recente sem esperar um novo render.
  // Evita contar o mesmo ciclo duas vezes se dois ticks rodarem seguidos e evita
  // recriar o setInterval durante o ciclo quando history ou currentTaskId mudam.
  const segmentsRef = useRef(null);
  const processedRef = useRef(0);
  const historyRef = useRef(history);
  const seriesRef = useRef(series);
  const settingsRef = useRef(settings);
  const currentTaskIdRef = useRef(currentTaskId);
  const ongoingEndTimeRef = useRef(null);

  // Atualiza o plano e o state juntos, para ref e state nunca ficarem diferentes
  const updateRun = useCallback((newSegments, newProcessed) => {
    segmentsRef.current = newSegments;
    processedRef.current = newProcessed;
    setSegments(newSegments);
    setProcessed(newProcessed);
  }, []);

  // Valores derivados: calculados a cada render, não guardados
  const timerRunning = segments != null;
  const timerType = getTypeById(typeId);
  const seconds = timerRunning
    ? liveSeconds
    : (pausedSeconds ?? getDurationSeconds(typeId, settings));
  const todayCount = getTodayCount(history, clock);
  const seriesCount = getSeriesCount(series, todayCount, clock);
  const currentTask = tasks.find((t) => t.id === currentTaskId) ?? null;
  // Só processa ciclos depois de tudo carregado, senão os pomodoros somados numa tarefa
  // seriam sobrescritos quando a lista de tarefas terminasse de carregar
  const ready = isLoaded && settingsLoaded && tasksLoaded;
  const persistedTaskId =
    ready && currentTaskId != null && !currentTask ? null : currentTaskId;

  useEffect(() => {
    historyRef.current = history;
    settingsRef.current = settings;
    currentTaskIdRef.current = persistedTaskId;
  }, [history, settings, persistedTaskId]);

  // Carrega o estado salvo ao abrir o app

  useEffect(() => {
    const getData = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
        if (jsonValue != null) {
          let saved = null;
          try {
            saved = JSON.parse(jsonValue);
          } catch (parseError) {
            console.warn("Estado do timer inválido, usando padrão", parseError);
          }
          if (saved && typeof saved === "object" && !Array.isArray(saved)) {
            // timerTypeId, seconds e endTime vêm da versão anterior do timer
            const savedTypeId = getTypeById(
              saved.typeId ?? saved.timerTypeId,
            ).id;
            setTypeId(savedTypeId);
            const rawPaused = saved.pausedSeconds ?? saved.seconds;
            setPausedSeconds(
              typeof rawPaused === "number" &&
                Number.isFinite(rawPaused) &&
                rawPaused >= 0
                ? rawPaused
                : null,
            );
            // `stats` é o contador só de hoje da versão anterior
            const initialHistory =
              saved.history &&
              typeof saved.history === "object" &&
              !Array.isArray(saved.history)
                ? normalizeHistory(saved.history)
                : historyFromLegacyStats(
                    saved.stats,
                    DEFAULT_SETTINGS.durations.focus,
                  );
            historyRef.current = initialHistory;
            setHistory(initialHistory);
            const savedSeries = normalizeSeries(saved.series);
            seriesRef.current = savedSeries;
            setSeries(savedSeries);
            const normalizedTaskId =
              saved.currentTaskId != null &&
              String(saved.currentTaskId).trim() !== ""
                ? String(saved.currentTaskId)
                : null;
            currentTaskIdRef.current = normalizedTaskId;
            setCurrentTaskId(normalizedTaskId);
            const validSegments = normalizeSavedSegments(saved.segments);
            if (validSegments) {
              const savedProcessed =
                Number.isInteger(saved.processed) && saved.processed >= 0
                  ? Math.min(saved.processed, validSegments.length)
                  : 0;
              updateRun(validSegments, savedProcessed);
            } else if (
              typeof saved.endTime === "number" &&
              Number.isFinite(saved.endTime)
            ) {
              updateRun([{ typeId: savedTypeId, endTime: saved.endTime }], 0);
            }
          }
        }
        setIsLoaded(true);
      } catch (e) {
        // Sem isLoaded, nada é gravado e o timer salvo não é sobrescrito
        console.warn("Erro ao carregar o timer", e);
      }
    };
    getData();
  }, [updateRun]);

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

  // Libera os players de áudio ao desmontar o provider
  useEffect(() => {
    return () => {
      releaseCycleSounds();
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
      history,
      series,
      currentTaskId: persistedTaskId,
    });
    AsyncStorage.setItem(TIMER_STORAGE_KEY, jsonValue).catch((e) =>
      console.warn("Erro ao salvar o timer", e),
    );
  }, [
    typeId,
    pausedSeconds,
    segments,
    processed,
    history,
    series,
    persistedTaskId,
    isLoaded,
  ]);

  const reconcileFinished = useCallback(
    (plan, finished, now) => {
      const currentSettings = settingsRef.current;
      const currentHistory = historyRef.current;
      if (finished <= processedRef.current) {
        return getSeriesCount(
          seriesRef.current,
          getTodayCount(currentHistory, now),
          now,
        );
      }

      const finishedSegments = plan.slice(processedRef.current, finished);
      const focusSegments = finishedSegments.filter(
        (s) => s.typeId === "focus",
      );
      const focusDone = focusSegments.length;
      const appActive = AppState.currentState === "active";
      if (
        shouldVibrateInApp({
          finishedSegments,
          now,
          settings: currentSettings,
          appActive,
        })
      ) {
        Vibration.vibrate(VIBRATION_PATTERN);
      }
      const alertSegment = getForegroundAlertSegment({
        finishedSegments,
        now,
        appActive,
      });
      if (alertSegment) {
        playCycleSound(alertSegment.typeId, {
          distinctSounds: currentSettings.distinctSounds,
        });
      }
      processedRef.current = finished;
      setProcessed(finished);

      let nextHistory = currentHistory;
      let nextSeries = seriesRef.current;
      if (focusDone > 0) {
        for (const segment of focusSegments) {
          nextSeries = addFocusToSeries(
            nextSeries,
            getTodayCount(currentHistory, segment.endTime),
            segment.endTime,
          );
        }
        seriesRef.current = nextSeries;
        setSeries(nextSeries);
        nextHistory = addFocusSessions(
          currentHistory,
          focusSegments.map((s) => ({
            endTime: s.endTime,
            minutes: getSegmentMinutes(s, currentSettings),
            taskId: currentTaskIdRef.current,
          })),
          now,
        );
        historyRef.current = nextHistory;
        setHistory(nextHistory);
        setClock(now);
        const taskId = currentTaskIdRef.current;
        if (taskId) {
          addPomodorosToTask(taskId, focusDone);
        }
      }
      const lastFinished = finishedSegments[finishedSegments.length - 1];
      const countAt = lastFinished?.endTime ?? now;
      return getSeriesCount(
        nextSeries,
        getTodayCount(nextHistory, countAt),
        countAt,
      );
    },
    [addPomodorosToTask],
  );

  const finishPlan = useCallback(
    (plan, count) => {
      const last = plan[plan.length - 1];
      ongoingEndTimeRef.current = null;
      updateRun(null, 0);
      setTypeId(getNextTypeId(last.typeId, count, settingsRef.current));
      setPausedSeconds(null);
    },
    [updateRun],
  );

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
      const count = reconcileFinished(plan, finished, now);

      if (finished >= plan.length) {
        // Acabou o que foi planejado: para no próximo modo sugerido
        finishPlan(plan, count);
        dismissOngoingNotification();
        return;
      }

      // Ainda há ciclo em andamento: mostra o modo e o tempo restante dele
      const current = plan[finished];
      setTypeId(current.typeId);
      setLiveSeconds(getRemainingSeconds(current.endTime, now));
      if (ongoingEndTimeRef.current !== current.endTime) {
        ongoingEndTimeRef.current = current.endTime;
        showOngoingNotification({
          typeLabel: getTypeById(current.typeId).display,
          endTime: current.endTime,
        });
      }
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
  }, [ready, segments, reconcileFinished, finishPlan]);

  // Play: planeja os ciclos a partir do tempo atual e agenda notificações e alarmes de áudio
  const startTimer = useCallback(async () => {
    // Prepara os sons no gesto do usuário (desbloqueia AudioContext na web e pré-carrega no nativo)
    prepareCycleSounds();
    const now = Date.now();
    const currentSettings = settingsRef.current;
    // Parado, o tempo na tela é o pausado ou a duração cheia. Calculado aqui (e não
    // lido de `seconds`) para o toggleTimer não mudar a cada segundo do timer
    const startSeconds =
      pausedSeconds ?? getDurationSeconds(typeId, currentSettings);
    const plan = buildPlan({
      typeId,
      seconds: startSeconds,
      now,
      focusCount: getSeriesCount(
        seriesRef.current,
        getTodayCount(historyRef.current, now),
        now,
      ),
      settings: currentSettings,
    });
    setClock(now);
    updateRun(plan, 0);
    setLiveSeconds(startSeconds);
    ongoingEndTimeRef.current = plan[0].endTime;
    const plannedNotifications = plan.map((segment, index) => ({
      ...getSegmentNotification(plan, index, currentSettings, currentTask),
      typeId: segment.typeId,
      date: segment.endTime,
    }));
    const audioAlarmsPromise = scheduleCycleAlarms(plannedNotifications, {
      distinctSounds: currentSettings.distinctSounds,
    });
    const ongoingPromise = showOngoingNotification({
      typeLabel: getTypeById(typeId).display,
      endTime: plan[0].endTime,
    });

    const ids = await scheduleTimerNotifications(plannedNotifications, {
      vibrate: currentSettings.vibrate,
      distinctSounds: currentSettings.distinctSounds,
    });
    // Pausou ou trocou de modo enquanto as notificações eram agendadas
    if (segmentsRef.current !== plan) {
      await Promise.all([ongoingPromise, audioAlarmsPromise]);
      const stopped = segmentsRef.current == null;
      if (stopped) {
        await cancelCycleAlarms();
      }
      await cancelTimerNotifications(
        ids,
        stopped ? undefined : { dismissOngoing: false },
      );
      return;
    }
  }, [typeId, pausedSeconds, currentTask, updateRun]);

  // Pausa: guarda quanto faltava no ciclo atual e cancela os avisos
  const pauseTimer = useCallback(() => {
    const plan = segmentsRef.current;
    if (plan == null) {
      return;
    }
    const now = Date.now();
    const finished = countFinishedSegments(plan, now);
    const count = reconcileFinished(plan, finished, now);
    ongoingEndTimeRef.current = null;
    if (finished >= plan.length) {
      finishPlan(plan, count);
    } else {
      const current = plan[finished];
      setTypeId(current.typeId);
      setPausedSeconds(getRemainingSeconds(current.endTime, now));
      updateRun(null, 0);
    }
    cancelCycleAlarms();
    cancelTimerNotifications();
  }, [reconcileFinished, finishPlan, updateRun]);

  const toggleTimer = useCallback(() => {
    if (timerRunning) {
      pauseTimer();
      return;
    }
    startTimer();
  }, [timerRunning, pauseTimer, startTimer]);

  // Trocar de modo manualmente sempre para o timer e começa com a duração cheia
  const toggleTimerType = useCallback(
    (newTimerType) => {
      ongoingEndTimeRef.current = null;
      if (timerRunning) {
        cancelCycleAlarms();
        cancelTimerNotifications();
      }
      updateRun(null, 0);
      setTypeId(newTimerType.id);
      setPausedSeconds(null);
    },
    [timerRunning, updateRun],
  );

  // Restaura o histórico de um backup, somando ao atual (ver mergeHistory)
  const importHistory = useCallback((raw) => {
    const merged = mergeHistory(
      historyRef.current,
      normalizeHistory(raw),
      Date.now(),
    );
    historyRef.current = merged;
    setHistory(merged);
  }, []);

  const selectCurrentTaskId = useCallback((id) => {
    const normalized =
      id != null && String(id).trim() !== "" ? String(id) : null;
    currentTaskIdRef.current = normalized;
    setCurrentTaskId(normalized);
  }, []);

  const value = useMemo(
    () => ({
      timerType,
      timerRunning,
      todayCount,
      seriesCount,
      segments,
      history,
      clock,
      currentTask,
      setCurrentTaskId: selectCurrentTaskId,
      importHistory,
      toggleTimer,
      toggleTimerType,
    }),
    [
      timerType,
      timerRunning,
      todayCount,
      seriesCount,
      segments,
      history,
      clock,
      currentTask,
      selectCurrentTaskId,
      importHistory,
      toggleTimer,
      toggleTimerType,
    ],
  );

  return (
    <TimerContext.Provider value={value}>
      <TimerSecondsContext.Provider value={seconds}>
        {children}
      </TimerSecondsContext.Provider>
    </TimerContext.Provider>
  );
}
