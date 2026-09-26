import { Pressable, StyleSheet, Text, View } from "react-native";
import { IconCheck, IconPencil, IconTrash } from "../Icons";
import { colors, fontSizes, radii } from "../../constants/theme";

const TaskItem = ({
  completed,
  text,
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
      <Pressable onPress={onToggleComplete}>
        <IconCheck checked={completed} />
      </Pressable>
      <Text style={styles.text}>{text}</Text>
      <Pressable onPress={onPressEdit}>
        <IconPencil />
      </Pressable>
      <Pressable onPress={onPressDelete}>
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
  text: {
    flex: 1,
    color: colors.background,
    fontSize: fontSizes.md,
    fontWeight: "bold",
  },
});

export default TaskItem;
