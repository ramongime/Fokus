import { StyleSheet, Text } from "react-native";
import { colors, fontSizes } from "../../constants/theme";

export const Timer = ({ totalSeconds }) => {
  const date = new Date(totalSeconds * 1000);
  const options = { minute: "2-digit", second: "2-digit" };
  return (
    <Text style={styles.timer}>
      {date.toLocaleTimeString("pt-BR", options)}
    </Text>
  );
};

const styles = StyleSheet.create({
  timer: {
    fontSize: fontSizes.xl,
    color: colors.text,
    fontWeight: "bold",
    textAlign: "center",
  },
});
