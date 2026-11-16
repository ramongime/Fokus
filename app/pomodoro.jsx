import { useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getDurationSeconds,
  getNextTypeId,
  getTypeById,
} from "../components/context/timerLogic";
import useSettingsContext from "../components/context/useSettingsContext";
import useTaskContext from "../components/context/useTaskContext";
import useTimerContext from "../components/context/useTimerContext";
import { FokusButton } from "../components/FokusButton";
import { IconPause, IconPlay } from "../components/Icons";
import { PomodoroCounter } from "../components/PomodoroCounter";
import { ProgressRing } from "../components/ProgressRing";
import { TaskPicker } from "../components/TaskPicker";
import { Timer } from "../components/Timer";
import { colors, fontSizes } from "../constants/theme";

export default function Pomodoro() {
  const {
    timerType,
    seconds,
    timerRunning,
    todayCount,
    currentTask,
    setCurrentTaskId,
    toggleTimer,
    toggleTimerType,
  } = useTimerContext();
  const { tasks, addTask } = useTaskContext();
  const { settings } = useSettingsContext();
  const navigation = useNavigation();

  const isFocus = timerType.id === "focus";
  const accent = isFocus ? colors.primary : colors.success;
  const background = isFocus ? colors.background : colors.backgroundBreak;
  const totalSeconds = getDurationSeconds(timerType.id, settings);
  const progress = totalSeconds > 0 ? 1 - seconds / totalSeconds : 0;
  // Posição do foco atual na série até a pausa longa. Ex.: "Foco · 2 de 4"
  const interval = settings.longBreakInterval;
  const phaseLabel = isFocus
    ? `${timerType.display} · ${(todayCount % interval) + 1} de ${interval}`
    : timerType.display;

  // Pular conta como se o foco atual fosse o próximo da série
  const nextType = getTypeById(
    getNextTypeId(timerType.id, todayCount + 1, settings),
  );
  const skipLabel = isFocus ? "Pular para a pausa" : "Pular para o foco";

  // O cabeçalho (botão do menu) acompanha a cor de fundo da fase
  useLayoutEffect(() => {
    navigation.setOptions({ headerStyle: { backgroundColor: background } });
  }, [navigation, background]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: background }]}
      edges={["bottom", "left", "right"]}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={[styles.phase, { color: accent }]}>{phaseLabel}</Text>
        <View style={styles.pickerWrapper}>
          <TaskPicker
            tasks={tasks}
            currentTask={currentTask}
            onSelect={setCurrentTaskId}
            onCreate={(description) => {
              const id = addTask(description);
              if (id) {
                setCurrentTaskId(id);
              }
            }}
          />
        </View>
        <ProgressRing progress={progress} color={accent}>
          <Timer totalSeconds={seconds} />
        </ProgressRing>
        <View style={styles.controls}>
          <FokusButton
            running={timerRunning}
            title={timerRunning ? "Pausar" : "Começar"}
            icon={timerRunning ? <IconPause /> : <IconPlay />}
            onPress={toggleTimer}
          />
          <Pressable
            onPress={() => toggleTimerType(nextType)}
            hitSlop={10}
            accessibilityRole="button"
            style={styles.skipButton}
          >
            <Text style={styles.skip}>{skipLabel}</Text>
          </Pressable>
        </View>
        <PomodoroCounter count={todayCount} longBreakInterval={interval} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
    paddingVertical: 24,
  },
  phase: {
    fontSize: fontSizes.sm,
    fontWeight: "bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  controls: {
    width: "85%",
    maxWidth: 380,
    gap: 18,
  },
  pickerWrapper: {
    width: "90%",
    maxWidth: 480,
    alignItems: "center",
  },
  skipButton: {
    alignSelf: "center",
  },
  skip: {
    color: colors.muted,
    fontSize: fontSizes.sm,
  },
});
