import { Column, Text } from "@expo/ui/jetpack-compose";
import {
  background,
  cornerRadius,
  fillMaxSize,
  paddingAll,
} from "@expo/ui/jetpack-compose/modifiers";
import { createWidget } from "expo-widgets";

const FokusWidget = (props) => {
  "widget";

  return (
    <Column
      verticalArrangement={{ spacedBy: 6 }}
      modifiers={[
        fillMaxSize(),
        background("#021123"),
        cornerRadius(20),
        paddingAll(16),
      ]}
    >
      <Text color="#00F4BF" style={{ fontSize: 11, fontWeight: "bold" }}>
        FOKUS
      </Text>
      <Text color="#FFFFFF" style={{ fontSize: 14, fontWeight: "bold" }}>
        {props.typeLabel}
      </Text>
      <Text color="#FFFFFF" style={{ fontSize: 28, fontWeight: "bold" }}>
        {props.timerText}
      </Text>
      <Text color="#98A0A8" style={{ fontSize: 12 }}>
        {props.timerRunning ? "Em andamento" : "Pausado"}
      </Text>
      <Text color="#00F4BF" style={{ fontSize: 12 }}>
        Hoje: {props.focusCount}/{props.dailyGoal} focos
      </Text>
    </Column>
  );
};

export default createWidget("FokusWidget", FokusWidget, {
  typeLabel: "Foco",
  timerText: "25:00",
  timerEndTime: null,
  timerRunning: false,
  focusCount: 0,
  dailyGoal: 4,
});
