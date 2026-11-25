import { useEffect } from "react";
import { Platform } from "react-native";
import {
  getNextDayStart,
  getTodayCount,
  todayKey,
} from "../components/context/historyLogic";
import {
  countFinishedSegments,
  formatSeconds,
  getDurationSeconds,
  getNextTypeId,
  getTypeById,
} from "../components/context/timerLogic";
import useSettingsContext from "../components/context/useSettingsContext";
import useTimerContext from "../components/context/useTimerContext";
import FokusWidget from "./FokusWidget";

export default function WidgetSync() {
  const { settings, isLoaded: settingsLoaded } = useSettingsContext();
  const {
    timerType,
    seconds,
    timerRunning,
    todayCount,
    seriesCount,
    segments,
    history,
  } = useTimerContext();
  const minutesRemaining = Math.ceil(seconds / 60);
  // Rodando, o widget mostra só minutos: arredonda para o efeito não rodar (e não
  // atualizar o widget nativo) a cada segundo, apenas quando o minuto muda
  const displaySeconds = timerRunning ? minutesRemaining * 60 : seconds;

  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }

    const makeWidgetProps = (
      segment,
      focusCount,
      timerText = formatSeconds(displaySeconds),
    ) => ({
      typeLabel: getTypeById(segment?.typeId ?? timerType.id).display,
      timerText,
      timerEndTime: segment?.endTime ?? null,
      timerRunning,
      focusCount,
      dailyGoal: settings.dailyFocusGoal,
    });
    const projectedCountFor = (timestamp, completedSegments) =>
      getTodayCount(history, timestamp) +
      completedSegments.filter(
        (segment) =>
          segment.typeId === "focus" &&
          todayKey(segment.endTime) === todayKey(timestamp),
      ).length;

    const currentIndex = timerRunning
      ? countFinishedSegments(segments ?? [], Date.now())
      : 0;
    const currentSegment = timerRunning ? segments?.[currentIndex] : null;
    try {
      const p = FokusWidget.updateSnapshot(
        makeWidgetProps(currentSegment, todayCount),
      );
      if (p && typeof p.catch === "function") {
        p.catch((e) =>
          console.warn("FokusWidget updateSnapshot async error:", e),
        );
      }
    } catch (e) {
      console.warn("FokusWidget updateSnapshot error:", e);
    }

    if (
      Platform.OS !== "ios" ||
      typeof FokusWidget.updateTimeline !== "function"
    ) {
      return;
    }

    // Linha do tempo do widget no iOS: um item por ciclo planejado e um à meia-noite,
    // para o "Hoje: X focos" zerar no dia novo mesmo com o app fechado
    const now = Date.now();
    let timeline;
    if (timerRunning && segments) {
      const remainingSegments = segments.slice(currentIndex);
      if (remainingSegments.length === 0) {
        return;
      }
      timeline = remainingSegments.map((segment, index) => {
        const date =
          index === 0
            ? new Date(now)
            : new Date(
                segment.startTime ??
                  segment.endTime -
                    getDurationSeconds(segment.typeId, settings) * 1000,
              );
        return {
          date,
          props: makeWidgetProps(
            segment,
            projectedCountFor(
              date.getTime(),
              remainingSegments.slice(0, index),
            ),
            formatSeconds(
              index === 0
                ? minutesRemaining * 60
                : segment.startTime != null
                  ? Math.round((segment.endTime - segment.startTime) / 1000)
                  : getDurationSeconds(segment.typeId, settings),
            ),
          ),
        };
      });
      const finalSegment = segments[segments.length - 1];
      const countAfterPlan = projectedCountFor(
        finalSegment.endTime,
        remainingSegments,
      );
      // A pausa depois do plano segue a série (que pode ter começado ontem)
      const seriesAfterPlan =
        seriesCount +
        remainingSegments.filter((segment) => segment.typeId === "focus")
          .length;
      const nextTypeId = getNextTypeId(
        finalSegment.typeId,
        seriesAfterPlan,
        settings,
      );

      timeline.push({
        date: new Date(finalSegment.endTime),
        props: {
          ...makeWidgetProps(
            null,
            countAfterPlan,
            formatSeconds(getDurationSeconds(nextTypeId, settings)),
          ),
          typeLabel: getTypeById(nextTypeId).display,
          timerRunning: false,
          timerEndTime: null,
        },
      });
    } else {
      timeline = [
        { date: new Date(now), props: makeWidgetProps(null, todayCount) },
      ];
    }

    // À meia-noite nenhum foco do dia novo terminou ainda: o contador é zero
    const midnight = getNextDayStart(now);
    const activeAtMidnight = timeline.filter(
      (entry) => entry.date.getTime() <= midnight,
    );
    const entryAtMidnight = activeAtMidnight[activeAtMidnight.length - 1];
    if (entryAtMidnight) {
      timeline.push({
        date: new Date(midnight),
        props: { ...entryAtMidnight.props, focusCount: 0 },
      });
      timeline.sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    try {
      const p = FokusWidget.updateTimeline(timeline);
      if (p && typeof p.catch === "function") {
        p.catch((e) =>
          console.warn("FokusWidget updateTimeline async error:", e),
        );
      }
    } catch (e) {
      console.warn("FokusWidget updateTimeline error:", e);
    }
  }, [
    settingsLoaded,
    settings,
    timerType,
    displaySeconds,
    minutesRemaining,
    timerRunning,
    todayCount,
    seriesCount,
    segments,
    history,
  ]);

  return null;
}
