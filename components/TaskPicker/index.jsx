import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, fontSizes, radii } from "../../constants/theme";

// Escolhe a tarefa em que o foco está sendo feito
export const TaskPicker = ({ tasks, currentTask, onSelect }) => {
  const [open, setOpen] = useState(false);
  const pendingTasks = tasks.filter((t) => !t.completed);

  const select = (taskId) => {
    onSelect(taskId);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        style={styles.trigger}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={
          currentTask
            ? `Focando em ${currentTask.description}. Toque para trocar`
            : "Escolher uma tarefa para o foco"
        }
      >
        <Text style={styles.triggerLabel}>🎯 Focando em</Text>
        <Text style={styles.triggerText} numberOfLines={1}>
          {currentTask ? currentTask.description : "Escolher uma tarefa"}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.title}>No que você vai focar?</Text>
            <FlatList
              data={pendingTasks}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.option,
                    currentTask?.id === item.id && styles.optionActive,
                  ]}
                  onPress={() => select(item.id)}
                >
                  <Text style={styles.optionText}>{item.description}</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.empty}>
                  Nenhuma tarefa pendente. Crie uma na lista de tarefas.
                </Text>
              }
              ListFooterComponent={
                currentTask ? (
                  <Pressable style={styles.clear} onPress={() => select(null)}>
                    <Text style={styles.clearText}>Focar sem tarefa</Text>
                  </Pressable>
                ) : null
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: radii.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 2,
  },
  triggerLabel: {
    color: colors.muted,
    fontSize: fontSizes.sm,
  },
  triggerText: {
    color: colors.text,
    fontSize: fontSizes.md,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    backgroundColor: colors.background,
    borderColor: colors.surface,
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: 24,
    width: "85%",
    maxHeight: "70%",
    gap: 16,
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: "bold",
    textAlign: "center",
  },
  option: {
    backgroundColor: colors.surfaceTranslucent,
    borderRadius: radii.sm,
    padding: 12,
  },
  optionActive: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.text,
    fontSize: fontSizes.md,
  },
  empty: {
    color: colors.muted,
    fontSize: fontSizes.md,
    textAlign: "center",
  },
  clear: {
    marginTop: 16,
    alignItems: "center",
  },
  clearText: {
    color: colors.primary,
    fontSize: fontSizes.md,
  },
});
