import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fontSizes, radii } from "../../constants/theme";

export const ActionButton = ({ active, onPress, display }) => {
  return (
    <Pressable
      style={active ? styles.contextButtonActive : null}
      onPress={onPress}
    >
      <Text style={styles.contextButtonText}>{display}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  contextButtonActive: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
  },
  contextButtonText: {
    fontSize: fontSizes.sm,
    color: colors.text,
    padding: 8,
  },
});
