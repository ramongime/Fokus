import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { colors, radii } from "../../constants/theme";

export const BackButtonDrawer = ({ backHref }) => {
  return (
    <Pressable
      style={styles.button}
      onPress={() => router.navigate(backHref)}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
      hitSlop={12}
    >
      <Feather name="arrow-left" size={20} color={colors.text} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    marginLeft: 16,
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceTranslucent,
    borderWidth: 1,
    borderColor: colors.surface,
  },
});
