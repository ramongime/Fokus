import { useEffect } from "react";
import { Platform } from "react-native";
import { getTodayCount, todayKey } from "../components/context/historyLogic";
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
    segments,
    history,
    clock,
  } = useTimerContext();
  const minutesRemaining = Math.ceil(seconds / 60);

  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }

    const makeWidgetProps = (
      segment,
      focusCount,
      timerText = formatSeconds(minutesRemaining * 60),
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
      timerRunning &&
      Platform.OS === "ios" &&
      typeof FokusWidget.updateTimeline === "function"
    ) {
      const remainingSegments = segments.slice(currentIndex);
      const timeline = remainingSegments.map((segment, index) => {
        const date =
          index === 0
            ? new Date()
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
      const nextTypeId = getNextTypeId(
        finalSegment.typeId,
        countAfterPlan,
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
    }
  }, [
    settingsLoaded,
    settings,
    timerType,
    minutesRemaining,
    timerRunning,
    todayCount,
    segments,
    history,
    clock,
  ]);

  return null;
}
