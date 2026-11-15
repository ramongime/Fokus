import { Pressable, StyleSheet, Text, View } from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { IconCheck, IconTrash } from "../Icons";
import { colors, fontSizes } from "../../constants/theme";

// Linha de tarefa sem cartão e sem ícones fixos:
// tocar no texto edita, deslizar para a esquerda revela "Excluir".
const TaskItem = ({
  completed,
  text,
  pomodoros,
  onToggleComplete,
  onPressEdit,
  onPressDelete,
}) => {
  const renderDeleteAction = () => (
    <Pressable
      style={styles.deleteAction}
      onPress={onPressDelete}
      accessibilityRole="button"
      accessibilityLabel={`Excluir "${text}"`}
    >
      <IconTrash color={colors.text} />
      <Text style={styles.deleteText}>Excluir</Text>
    </Pressable>
  );

  return (
    <Swipeable
      renderRightActions={renderDeleteAction}
      rightThreshold={40}
      overshootRight={false}
    >
      <View style={styles.row}>
        <Pressable
          onPress={onToggleComplete}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: !!completed }}
          accessibilityLabel={`Concluir "${text}"`}
        >
          <IconCheck checked={completed} />
        </Pressable>
        <Pressable
          style={styles.content}
          onPress={onPressEdit}
          accessibilityRole="button"
          accessibilityLabel={`Editar "${text}"`}
          accessibilityHint="Deslize para a esquerda para excluir"
          // Leitores de tela não deslizam: a exclusão também fica como ação
          accessibilityActions={[{ name: "delete", label: "Excluir" }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "delete") onPressDelete();
          }}
        >
          <Text style={[styles.text, completed && styles.textCompleted]}>
            {text}
          </Text>
          {pomodoros > 0 && (
            <Text style={styles.pomodoros}>
              {pomodoros} {pomodoros === 1 ? "foco" : "focos"}
            </Text>
          )}
        </Pressable>
      </View>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 14,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  text: {
    color: colors.text,
    fontSize: fontSizes.md,
  },
  textCompleted: {
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  pomodoros: {
    color: colors.muted,
    fontSize: fontSizes.sm,
  },
  deleteAction: {
    width: 88,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.danger,
  },
  deleteText: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: "bold",
  },
});

export default TaskItem;
