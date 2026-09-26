import { StyleSheet, Text, View } from "react-native";
import { colors, fontSizes, radii } from "../../constants/theme";

export const StatTile = ({ label, value }) => {
  return (
    <View
      style={styles.tile}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.surfaceTranslucent,
    borderColor: colors.surface,
    borderWidth: 2,
    borderRadius: radii.sm,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  value: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: "bold",
  },
  label: {
    color: colors.muted,
    fontSize: fontSizes.sm,
    textAlign: "center",
  },
});
