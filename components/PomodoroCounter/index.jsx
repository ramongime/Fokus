import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fontSizes } from "../../constants/theme";

// Uma bolinha por foco feito hoje, agrupadas em séries até a pausa longa.
// A série atual é completada com bolinhas vazias, para mostrar quanto falta.
// Ex.: 6 focos com pausa longa a cada 4 -> [●●●●] [●●○○]
export const getCounterSeries = (count, longBreakInterval) => {
  const interval = Math.max(1, Math.floor(longBreakInterval) || 1);
  const done = Math.max(0, Math.floor(count) || 0);
  const seriesCount = Math.max(1, Math.ceil(done / interval));
  return Array.from({ length: seriesCount }, (_, series) =>
    Math.min(interval, Math.max(0, done - series * interval)),
  );
};

export const PomodoroCounter = memo(function PomodoroCounter({
  count,
  longBreakInterval,
}) {
  const interval = Math.max(1, Math.floor(longBreakInterval) || 1);
  const series = getCounterSeries(count, interval);
  const label = `${count} ${count === 1 ? "foco" : "focos"} hoje`;

  return (
    <View style={styles.container} accessible accessibilityLabel={label}>
      <View style={styles.series}>
        {series.map((filled, seriesIndex) => (
          <View
            key={seriesIndex}
            style={styles.dots}
            testID="pomodoro-counter-series"
          >
            {Array.from({ length: interval }, (_, index) => (
              <View
                key={index}
                testID={
                  index < filled
                    ? "pomodoro-counter-dot-filled"
                    : "pomodoro-counter-dot"
                }
                style={[styles.dot, index < filled && styles.dotFilled]}
              />
            ))}
          </View>
        ))}
      </View>
      <Text style={styles.text}>🍅 {label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 8,
    width: "90%",
    maxWidth: 380,
  },
  series: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: 16,
    rowGap: 8,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dotFilled: {
    backgroundColor: colors.primary,
  },
  text: {
    color: colors.muted,
    fontSize: fontSizes.sm,
  },
});
