import { Feather } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { Pressable, StyleSheet } from "react-native";
import { colors, radii } from "../../constants/theme";

export const MenuToggleButton = () => {
  const navigation = useNavigation();

  const handlePress = () => {
    if (typeof navigation.toggleDrawer === "function") {
      navigation.toggleDrawer();
    } else {
      navigation.dispatch({ type: "TOGGLE_DRAWER" });
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Abrir menu de navegação"
      hitSlop={12}
    >
      <Feather name="menu" size={20} color={colors.text} />
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
