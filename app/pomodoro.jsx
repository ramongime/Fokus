import { Image, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionButton } from "../components/ActionButton";
import useSettingsContext from "../components/context/useSettingsContext";
import useTaskContext from "../components/context/useTaskContext";
import useTimerContext from "../components/context/useTimerContext";
import { FokusButton } from "../components/FokusButton";
import { IconPause, IconPlay } from "../components/Icons";
import { PomodoroCounter } from "../components/PomodoroCounter";
import { TaskPicker } from "../components/TaskPicker";
import { Timer } from "../components/Timer";
import { pomodoro } from "../constants/pomodoro";
import { colors, radii } from "../constants/theme";

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
  const { tasks } = useTaskContext();
  const { settings } = useSettingsContext();

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
          <TaskPicker
            tasks={tasks}
            currentTask={currentTask}
            onSelect={setCurrentTaskId}
          />
          <Timer totalSeconds={seconds} />
          <FokusButton
            title={timerRunning ? "Pausar" : "Começar"}
            icon={timerRunning ? <IconPause /> : <IconPlay />}
            onPress={toggleTimer}
          />
          <PomodoroCounter
            count={todayCount}
            longBreakInterval={settings.longBreakInterval}
          />
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
});
