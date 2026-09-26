import { StyleSheet, Text } from "react-native";
import { colors, fontSizes } from "../../constants/theme";
import { formatSeconds } from "../context/timerLogic";

export const Timer = ({ totalSeconds }) => {
  return <Text style={styles.timer}>{formatSeconds(totalSeconds)}</Text>;
};

const styles = StyleSheet.create({
  timer: {
    fontSize: fontSizes.xl,
    color: colors.text,
    fontWeight: "bold",
    textAlign: "center",
  },
});
