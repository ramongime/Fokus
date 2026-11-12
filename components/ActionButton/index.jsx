import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fontSizes, radii } from "../../constants/theme";

export const ActionButton = ({ active, onPress, display }) => {
  return (
    <Pressable
      style={[styles.button, active && styles.buttonActive]}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!active }}
    >
      <Text
        style={[styles.text, active ? styles.textActive : styles.textInactive]}
      >
        {display}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radii.sm,
  },
  buttonActive: {
    backgroundColor: colors.surface,
  },
  text: {
    fontSize: fontSizes.sm,
  },
  textActive: {
    color: colors.text,
    fontWeight: "bold",
  },
  textInactive: {
    color: colors.muted,
  },
});
