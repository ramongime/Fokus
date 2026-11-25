import { Text, VStack } from "@expo/ui/swift-ui";
import {
  background,
  cornerRadius,
  font,
  foregroundColor,
  padding,
} from "@expo/ui/swift-ui/modifiers";
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

  const hasLiveTimer = props.timerRunning && props.timerEndTime != null;

  return (
    <VStack
      spacing={7}
      modifiers={[
        background("#021123"),
        cornerRadius(20),
        padding({ all: 16 }),
      ]}
    >
      <Text
        modifiers={[
          font({ size: 11, weight: "bold" }),
          foregroundColor("#00F4BF"),
        ]}
      >
        FOKUS
      </Text>
      <Text
        modifiers={[
          font({ size: 14, weight: "semibold" }),
          foregroundColor("#FFFFFF"),
        ]}
      >
        {props.typeLabel}
      </Text>
      {hasLiveTimer ? (
        <Text
          timerInterval={{
            lower: new Date(),
            upper: new Date(props.timerEndTime),
          }}
          countsDown
          modifiers={[
            font({ size: 30, weight: "bold" }),
            foregroundColor("#FFFFFF"),
          ]}
        />
      ) : (
        <Text
          modifiers={[
            font({ size: 30, weight: "bold" }),
            foregroundColor("#FFFFFF"),
          ]}
        >
          {props.timerText}
        </Text>
      )}
      <Text modifiers={[font({ size: 12 }), foregroundColor("#98A0A8")]}>
        {props.timerRunning ? "Em andamento" : "Pausado"}
      </Text>
      <Text modifiers={[font({ size: 12 }), foregroundColor("#00F4BF")]}>
        Hoje: {focusCount}/{props.dailyGoal} focos
      </Text>
    </VStack>
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
