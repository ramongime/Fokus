import { Pressable, StyleSheet, Text, View } from "react-native";
import { IconCheck, IconPencil, IconTrash } from "../Icons";
import { colors, fontSizes, radii } from "../../constants/theme";

const TaskItem = ({
  completed,
  text,
  pomodoros,
  onToggleComplete,
  onPressEdit,
  onPressDelete,
}) => {
  const cardStyles = [styles.card];

  if (completed) {
    cardStyles.push(styles.cardCompleted);
  }

  return (
    <View style={cardStyles}>
      <Pressable
        onPress={onToggleComplete}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: !!completed }}
        accessibilityLabel={`Concluir "${text}"`}
      >
        <IconCheck checked={completed} />
      </Pressable>
      <View style={styles.content}>
        <Text style={styles.text}>{text}</Text>
        {pomodoros > 0 && (
          <Text style={styles.pomodoros}>
            🍅 {pomodoros} {pomodoros === 1 ? "pomodoro" : "pomodoros"}
          </Text>
        )}
      </View>
      <Pressable
        onPress={onPressEdit}
        accessibilityRole="button"
        accessibilityLabel={`Editar "${text}"`}
      >
        <IconPencil />
      </Pressable>
      <Pressable
        onPress={onPressDelete}
        accessibilityRole="button"
        accessibilityLabel={`Excluir "${text}"`}
      >
        <IconTrash />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 18,
    borderRadius: radii.sm,
    gap: 8,
  },
  cardCompleted: {
    backgroundColor: colors.successDark,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  text: {
    color: colors.background,
    fontSize: fontSizes.md,
    fontWeight: "bold",
  },
  pomodoros: {
    color: colors.background,
    fontSize: fontSizes.sm,
  },
});

export default TaskItem;
