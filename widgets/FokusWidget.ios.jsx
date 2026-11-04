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
        Hoje: {props.focusCount}/{props.dailyGoal} focos
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
  dailyGoal: 4,
});
