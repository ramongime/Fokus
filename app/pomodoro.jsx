import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionButton } from "../components/ActionButton";
import useTimerContext from "../components/context/useTimerContext";
import { FokusButton } from "../components/FokusButton";
import { IconPause, IconPlay } from "../components/Icons";
import { Timer } from "../components/Timer";
import { pomodoro } from "../constants/pomodoro";
import { colors, fontSizes, radii } from "../constants/theme";

export default function Pomodoro() {
  const { timerType, seconds, timerRunning, toggleTimer, toggleTimerType } =
    useTimerContext();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Image source={timerType.image} />
        <View style={styles.actions}>
          <View style={styles.context}>
            {pomodoro.map((p) => (
              <ActionButton
                key={p.id}
                active={timerType.id === p.id}
                onPress={() => toggleTimerType(p)}
                display={p.display}
              />
            ))}
          </View>
          <Timer totalSeconds={seconds} />
          <FokusButton
            title={timerRunning ? "Pausar" : "Começar"}
            icon={timerRunning ? <IconPause /> : <IconPlay />}
            onPress={toggleTimer}
          />
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Projeto fictício e sem fins comerciais.
          </Text>
          <Text style={styles.footerText}>Desenvolvido por Alura.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  inner: {
    alignItems: "center",
    gap: 40,
  },
  actions: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    backgroundColor: colors.surfaceTranslucent,
    width: "80%",
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.surface,
    gap: 32,
  },
  context: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  footer: {
    width: "80%",
  },
  footerText: {
    textAlign: "center",
    color: colors.muted,
    fontSize: fontSizes.sm,
  },
});
