import { Pressable, StyleSheet, Text, View } from "react-native";
import { IconCheck, IconPencil, IconTrash } from "../Icons";
import { colors, fontSizes } from "../../constants/theme";

// Linha de tarefa sem cartão: check, texto, focos e ações discretas
const TaskItem = ({
  completed,
  text,
  pomodoros,
  onToggleComplete,
  onPressEdit,
  onPressDelete,
}) => {
  return (
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
      <View style={styles.content}>
        <Text style={[styles.text, completed && styles.textCompleted]}>
          {text}
        </Text>
        {pomodoros > 0 && (
          <Text style={styles.pomodoros}>
            {pomodoros} {pomodoros === 1 ? "foco" : "focos"}
          </Text>
        )}
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={onPressEdit}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Editar "${text}"`}
        >
          <IconPencil color={colors.muted} />
        </Pressable>
        <Pressable
          onPress={onPressDelete}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Excluir "${text}"`}
        >
          <IconTrash color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 14,
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
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    opacity: 0.7,
  },
});

export default TaskItem;
