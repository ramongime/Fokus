import { StyleSheet, Text, View } from "react-native";
import { colors, fontSizes } from "../../constants/theme";

export const SettingRow = ({ label, description, children }) => {
  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        <Text style={styles.label}>{label}</Text>
        {description ? (
          <Text style={styles.description}>{description}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 12,
  },
  texts: {
    flex: 1,
    gap: 4,
  },
  label: {
    color: colors.text,
    fontSize: fontSizes.md,
  },
  description: {
    color: colors.muted,
    fontSize: fontSizes.sm,
  },
});
