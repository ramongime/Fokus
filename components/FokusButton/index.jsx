import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fontSizes, radii } from "../../constants/theme";

export const FokusButton = ({ onPress, title, icon, outline }) => {
  return (
    <Pressable
      style={[styles.button, outline && styles.outlineButton]}
      onPress={onPress}
    >
      {icon}
      <Text style={[styles.buttonText, outline && styles.outlineButtonText]}>
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: 8,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderColor: colors.primary,
    borderWidth: 2,
  },
  buttonText: {
    textAlign: "center",
    color: colors.background,
    fontSize: fontSizes.md,
  },
  outlineButtonText: {
    color: colors.primary,
  },
});
