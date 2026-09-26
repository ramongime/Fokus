import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "../../constants/theme";

export const BackButtonDrawer = ({ backHref }) => {
  return (
    <Ionicons
      name="arrow-back"
      size={24}
      color={colors.text}
      style={{ marginLeft: 16 }}
      onPress={() => router.navigate(backHref)}
      accessibilityRole="button"
      accessibilityLabel="Voltar"
    />
  );
};
