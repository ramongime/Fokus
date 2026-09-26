import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  formatMinutes,
  getStreak,
  getWeek,
  summarizeWeek,
} from "../components/context/historyLogic";
import useTimerContext from "../components/context/useTimerContext";
import { StatTile } from "../components/StatTile";
import { WeekChart } from "../components/WeekChart";
import { colors, fontSizes, radii } from "../constants/theme";

export default function History() {
  const { history } = useTimerContext();
  const now = Date.now();
  const week = getWeek(history, now);
  const total = summarizeWeek(week);
  const streak = getStreak(history, now);

  const [selectedKey, setSelectedKey] = useState(week[6].key);
  const selected = week.find((d) => d.key === selectedKey) ?? week[6];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>Histórico</Text>

      <View style={styles.tiles}>
        <StatTile label="Focos na semana" value={total.count} />
        <StatTile label="Tempo focado" value={formatMinutes(total.minutes)} />
        <StatTile
          label="Sequência"
          value={`${streak} ${streak === 1 ? "dia" : "dias"}`}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Focos por dia</Text>
        <Text style={styles.cardSubtitle}>Últimos 7 dias</Text>
        <WeekChart
          days={week}
          selectedKey={selected.key}
          onSelect={setSelectedKey}
        />
        <View style={styles.detail}>
          <Text style={styles.detailDay}>
            {selected.isToday ? "Hoje" : selected.weekday}, {selected.dateLabel}
          </Text>
          <Text style={styles.detailValue}>
            {selected.count} {selected.count === 1 ? "foco" : "focos"} ·{" "}
            {formatMinutes(selected.minutes)}
          </Text>
        </View>
      </View>

      {total.count === 0 ? (
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
    gap: 24,
    paddingBottom: 40,
  },
  title: {
    textAlign: "center",
    color: colors.text,
    fontSize: fontSizes.lg,
    marginTop: 16,
  },
  tiles: {
    flexDirection: "row",
    gap: 8,
  },
  card: {
    backgroundColor: colors.surfaceTranslucent,
    borderColor: colors.surface,
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: 20,
    gap: 4,
  },
  cardTitle: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: "bold",
  },
  cardSubtitle: {
    color: colors.muted,
    fontSize: fontSizes.sm,
    marginBottom: 12,
  },
  detail: {
    marginTop: 16,
    alignItems: "center",
    gap: 2,
  },
  detailDay: {
    color: colors.muted,
    fontSize: fontSizes.sm,
  },
  detailValue: {
    color: colors.text,
    fontSize: fontSizes.md,
  },
  empty: {
    color: colors.muted,
    fontSize: fontSizes.md,
    textAlign: "center",
  },
});
