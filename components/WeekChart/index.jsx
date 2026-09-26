import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSizes } from "../../constants/theme";

const CHART_HEIGHT = 160;
const LABEL_HEIGHT = 20;

// Barras de focos por dia. Tocar numa barra seleciona o dia (a tela mostra os detalhes).
export const WeekChart = ({ days, selectedKey, onSelect }) => {
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <View style={styles.container}>
      <View style={styles.plot}>
        <View style={styles.baseline} />
        {days.map((day) => {
          const selected = day.key === selectedKey;
          const height = (day.count / max) * CHART_HEIGHT;
          return (
            <Pressable
              key={day.key}
              style={styles.column}
              onPress={() => onSelect(day.key)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${day.weekday}, ${day.dateLabel}: ${day.count} ${
                day.count === 1 ? "foco" : "focos"
              }`}
            >
              <Text style={[styles.value, !selected && styles.hidden]}>
                {day.count}
              </Text>
              <View
                style={[
                  styles.bar,
                  { height },
                  selected && day.count > 0 && styles.barSelected,
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.labels}>
        {days.map((day) => (
          <Text
            key={day.key}
            style={[styles.label, day.isToday && styles.labelToday]}
          >
            {day.isToday ? "Hoje" : day.weekday}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  plot: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: CHART_HEIGHT + LABEL_HEIGHT,
    gap: 2,
  },
  baseline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: colors.surface,
  },
  column: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  value: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: "bold",
    height: LABEL_HEIGHT,
  },
  hidden: {
    opacity: 0,
  },
  bar: {
    width: "60%",
    maxWidth: 32,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barSelected: {
    borderWidth: 2,
    borderBottomWidth: 0,
    borderColor: colors.text,
  },
  labels: {
    flexDirection: "row",
    gap: 2,
  },
  label: {
    flex: 1,
    textAlign: "center",
    color: colors.muted,
    fontSize: fontSizes.sm,
  },
  labelToday: {
    color: colors.text,
    fontWeight: "bold",
  },
});
