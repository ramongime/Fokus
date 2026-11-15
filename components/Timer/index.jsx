import { StyleSheet, Text } from "react-native";
import { colors, fontSizes } from "../../constants/theme";
import { formatSeconds } from "../context/timerLogic";

export const Timer = ({ totalSeconds }) => {
  return (
    <Text style={styles.timer} accessibilityRole="timer">
      {formatSeconds(totalSeconds)}
    </Text>
  );
};

const styles = StyleSheet.create({
  timer: {
    fontSize: fontSizes.timer,
    color: colors.text,
    fontWeight: "300",
    letterSpacing: -2,
    textAlign: "center",
    // Dígitos de largura fixa: o número não "pula" enquanto a contagem anda
    fontVariant: ["tabular-nums"],
  },
});
