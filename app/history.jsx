import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  formatMinutes,
  getMonth,
  getOldestHistoryMonthKey,
  getStreak,
  getWeek,
  summarizeMonth,
  summarizeWeek,
} from "../components/context/historyLogic";
import useSettingsContext from "../components/context/useSettingsContext";
import useTimerContext from "../components/context/useTimerContext";
import { StatTile } from "../components/StatTile";
import { WeekChart } from "../components/WeekChart";
import { colors, fontSizes, radii } from "../constants/theme";

export default function History() {
  const params = useLocalSearchParams();
  const { history, clock: now } = useTimerContext();
  const { settings } = useSettingsContext();
  const [prevParamView, setPrevParamView] = useState(params?.view);
  const [view, setView] = useState(params?.view === "month" ? "month" : "week");
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedKey, setSelectedKey] = useState(null);

  if (params?.view !== prevParamView) {
    setPrevParamView(params?.view);
    if (params?.view === "month" || params?.view === "week") {
      setView(params.view);
    }
  }

  const week = useMemo(() => getWeek(history, now), [history, now]);
  const weekTotal = useMemo(() => summarizeWeek(week), [week]);
  const month = useMemo(
    () => getMonth(history, now, monthOffset),
    [history, now, monthOffset],
  );
  const monthTotal = useMemo(() => summarizeMonth(month), [month]);
  const streak = useMemo(() => getStreak(history, now), [history, now]);
  const oldestMonthKey = useMemo(() => getOldestHistoryMonthKey(now), [now]);
  const selectedWeekDay =
    week.find((day) => day.key === selectedKey) ?? week[6];
  const selectedDay =
    month.days.find((day) => day.key === selectedKey) ??
    month.days.find((day) => day.isToday) ??
    month.days.find((day) => !day.empty && !day.isFuture);
  const goal = settings.dailyFocusGoal;
  const goalPercent = selectedDay
    ? Math.min((selectedDay.count / goal) * 100, 100)
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>Histórico</Text>

      <View style={styles.tabs} accessibilityRole="tablist">
        <Pressable
          style={[styles.tab, view === "week" && styles.tabSelected]}
          onPress={() => setView("week")}
          accessibilityRole="tab"
          accessibilityState={{ selected: view === "week" }}
        >
          <Text
            style={[styles.tabText, view === "week" && styles.tabTextSelected]}
          >
            Semana
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, view === "month" && styles.tabSelected]}
          onPress={() => setView("month")}
          accessibilityRole="tab"
          accessibilityState={{ selected: view === "month" }}
        >
          <Text
            style={[styles.tabText, view === "month" && styles.tabTextSelected]}
          >
            Mês e metas
          </Text>
        </Pressable>
      </View>

      <View style={styles.tiles}>
        <StatTile
          label={view === "month" ? "Focos no mês" : "Focos na semana"}
          value={view === "month" ? monthTotal.count : weekTotal.count}
        />
        <StatTile
          label="Tempo focado"
          value={formatMinutes(
            view === "month" ? monthTotal.minutes : weekTotal.minutes,
          )}
        />
        <StatTile
          label="Sequência"
          value={`${streak} ${streak === 1 ? "dia" : "dias"}`}
        />
      </View>

      {view === "week" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Focos por dia</Text>
          <Text style={styles.cardSubtitle}>Últimos 7 dias</Text>
          <WeekChart
            days={week}
            selectedKey={selectedWeekDay.key}
            onSelect={setSelectedKey}
          />
          <View style={styles.detail}>
            <Text style={styles.detailDay}>
              {selectedWeekDay.isToday ? "Hoje" : selectedWeekDay.weekday},{" "}
              {selectedWeekDay.dateLabel}
            </Text>
            <Text style={styles.detailValue}>
              {selectedWeekDay.count}{" "}
              {selectedWeekDay.count === 1 ? "foco" : "focos"} ·{" "}
              {formatMinutes(selectedWeekDay.minutes)}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.monthHeader}>
            <Pressable
              style={styles.monthArrow}
              onPress={() => {
                setMonthOffset((offset) => offset - 1);
                setSelectedKey(null);
              }}
              disabled={month.key <= oldestMonthKey}
              accessibilityRole="button"
              accessibilityLabel="Mês anterior"
              accessibilityState={{ disabled: month.key <= oldestMonthKey }}
            >
              <Text
                style={[
                  styles.monthArrowText,
                  month.key <= oldestMonthKey && styles.disabled,
                ]}
              >
                ‹
              </Text>
            </Pressable>
            <View style={styles.monthHeading}>
              <Text style={styles.monthTitle}>{month.title}</Text>
            </View>
            <Pressable
              style={styles.monthArrow}
              onPress={() => {
                setMonthOffset((offset) => offset + 1);
                setSelectedKey(null);
              }}
              disabled={monthOffset >= 0}
              accessibilityRole="button"
              accessibilityLabel="Próximo mês"
              accessibilityState={{ disabled: monthOffset >= 0 }}
            >
              <Text
                style={[
                  styles.monthArrowText,
                  monthOffset >= 0 && styles.disabled,
                ]}
              >
                ›
              </Text>
            </Pressable>
          </View>

          <View style={styles.calendar}>
            <View style={styles.calendarRow}>
              {month.weekdays.map((weekday) => (
                <Text key={weekday} style={styles.weekday}>
                  {weekday}
                </Text>
              ))}
            </View>
            {Array.from({ length: month.days.length / 7 }, (_, weekIndex) => (
              <View key={`week-${weekIndex}`} style={styles.calendarRow}>
                {month.days
                  .slice(weekIndex * 7, weekIndex * 7 + 7)
                  .map((day) => {
                    if (day.empty) {
                      return <View key={day.key} style={styles.dayCell} />;
                    }

                    const selected =
                      day.key === (selectedDay?.key ?? selectedKey);
                    const reachedGoal = day.count >= goal;
                    return (
                      <Pressable
                        key={day.key}
                        style={styles.dayCell}
                        onPress={() => setSelectedKey(day.key)}
                        disabled={day.isFuture}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected,
                          disabled: day.isFuture,
                        }}
                        accessibilityLabel={`${day.dayNumber}: ${day.count} ${day.count === 1 ? "foco" : "focos"}${reachedGoal ? ", meta atingida" : ""}`}
                      >
                        <View
                          style={[
                            styles.dayBubble,
                            day.count > 0 && styles.dayWithFocus,
                            reachedGoal && styles.dayGoalReached,
                            selected && styles.daySelected,
                            day.isFuture && styles.dayFuture,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayNumber,
                              day.count > 0 && styles.dayNumberWithFocus,
                              selected && styles.dayNumberSelected,
                            ]}
                          >
                            {day.dayNumber}
                          </Text>
                        </View>
                        <Text style={styles.dayCount}>
                          {day.count > 0 ? day.count : " "}
                        </Text>
                      </Pressable>
                    );
                  })}
              </View>
            ))}
          </View>

          <View style={styles.legend}>
            <View style={[styles.legendDot, styles.dayWithFocus]} />
            <Text style={styles.legendText}>focos realizados</Text>
            <View style={[styles.legendDot, styles.dayGoalReached]} />
            <Text style={styles.legendText}>meta atingida</Text>
          </View>

          {selectedDay ? (
            <View style={styles.goalDetails}>
              <Text style={styles.detailDay}>
                {selectedDay.isToday ? "Hoje" : selectedDay.dateLabel}
              </Text>
              <Text style={styles.detailValue}>
                {selectedDay.count} {selectedDay.count === 1 ? "foco" : "focos"}{" "}
                · {formatMinutes(selectedDay.minutes)}
              </Text>
              <View
                style={styles.progressTrack}
                accessibilityRole="progressbar"
                accessibilityLabel={`${selectedDay.count} de ${goal} focos da meta diária`}
                accessibilityValue={{
                  min: 0,
                  max: goal,
                  now: Math.min(selectedDay.count, goal),
                }}
              >
                <View
                  style={[styles.progressFill, { width: `${goalPercent}%` }]}
                />
              </View>
              <Text style={styles.goalText}>
                {selectedDay.count >= goal
                  ? `Meta diária atingida · ${selectedDay.count}/${goal} focos`
                  : `Meta diária · ${selectedDay.count}/${goal} focos`}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {(view === "month" ? monthTotal.count : weekTotal.count) === 0 ? (
        <Text style={styles.empty}>
          Complete um foco para começar seu histórico. 🍅
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    alignSelf: "center",
    width: "90%",
    maxWidth: 480,
    gap: 12,
    paddingBottom: 24,
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: "bold",
    marginTop: 8,
  },
  tabs: {
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: 3,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: radii.sm,
  },
  tabSelected: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextSelected: {
    color: colors.background,
  },
  tiles: {
    flexDirection: "row",
    gap: 8,
  },
  card: {
    backgroundColor: colors.surfaceTranslucent,
    borderColor: colors.surface,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
    gap: 8,
  },
  cardTitle: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: "bold",
  },
  monthTitle: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  cardSubtitle: {
    color: colors.muted,
    fontSize: 11,
  },
  detail: {
    marginTop: 10,
    alignItems: "center",
    gap: 2,
  },
  detailDay: {
    color: colors.muted,
    fontSize: 12,
    textTransform: "capitalize",
  },
  detailValue: {
    color: colors.text,
    fontSize: fontSizes.sm,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthHeading: {
    alignItems: "center",
    gap: 2,
  },
  monthArrow: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  monthArrowText: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 28,
  },
  disabled: {
    opacity: 0.3,
  },
  calendar: {
    gap: 2,
  },
  calendarRow: {
    flexDirection: "row",
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    color: colors.muted,
    fontSize: 10,
    paddingVertical: 2,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1.05,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBubble: {
    width: 28,
    height: 28,
    maxWidth: "90%",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  dayWithFocus: {
    backgroundColor: colors.surface,
  },
  dayGoalReached: {
    backgroundColor: colors.successDark,
  },
  daySelected: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  dayFuture: {
    opacity: 0.25,
  },
  dayNumber: {
    color: colors.muted,
    fontSize: 11,
  },
  dayNumberWithFocus: {
    color: colors.text,
  },
  dayNumberSelected: {
    fontWeight: "bold",
  },
  dayCount: {
    position: "absolute",
    bottom: -1,
    color: colors.success,
    fontSize: 8,
    lineHeight: 10,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 2,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: colors.muted,
    fontSize: 10,
    marginRight: 6,
  },
  goalDetails: {
    alignItems: "center",
    gap: 3,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  progressTrack: {
    height: 6,
    width: "100%",
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: colors.surface,
    marginTop: 3,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  goalText: {
    color: colors.muted,
    fontSize: 11,
  },
  empty: {
    color: colors.muted,
    fontSize: fontSizes.md,
    textAlign: "center",
  },
});
