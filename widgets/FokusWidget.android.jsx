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

  // O contador é do dia `focusDay`. Se o widget for desenhado num dia depois desse
  // (atualização periódica do sistema, sem o app aberto), os focos de hoje são 0.
  // Tudo aqui dentro: o layout do widget roda isolado, sem imports.
  const now = new Date();
  const pad = (value) => (value < 10 ? `0${value}` : `${value}`);
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const focusCount =
    props.focusDay && props.focusDay !== today ? 0 : props.focusCount;

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
        Hoje: {focusCount}/{props.dailyGoal} focos
      </Text>
    </Column>
  );
};

export default createWidget("FokusWidget", FokusWidget, {
  typeLabel: "Foco",
  timerText: "25:00",
  timerEndTime: 0,
  timerRunning: false,
  focusCount: 0,
  focusDay: "",
  dailyGoal: 4,
});
