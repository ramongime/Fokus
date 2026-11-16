import { router } from "expo-router";
import { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ConfirmModal } from "../../components/ConfirmModal";
import useTaskContext from "../../components/context/useTaskContext";
import TaskItem from "../../components/TaskItem";
import { colors, fontSizes, radii } from "../../constants/theme";

export default function Tasks() {
  const { tasks, addTask, deleteTask, toggleTaskCompleted } = useTaskContext();
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [draft, setDraft] = useState("");
  const pendingCount = tasks.filter((t) => !t.completed).length;

  const confirmDelete = () => {
    deleteTask(taskToDelete.id);
    setTaskToDelete(null);
  };

  // Cria direto da lista: digita e confirma, sem abrir outra tela
  const create = () => {
    const description = draft.trim();
    if (!description) return;
    addTask(description);
    setDraft("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.wrapper}>
        <FlatList
          data={tasks}
          renderItem={({ item }) => (
            <TaskItem
              completed={item.completed}
              text={item.description}
              pomodoros={item.pomodoros}
              onPressDelete={() => setTaskToDelete(item)}
              onToggleComplete={() => toggleTaskCompleted(item.id)}
              onPressEdit={() => router.navigate(`/edit-task/${item.id}`)}
            />
          )}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>Tarefas</Text>
                {tasks.length > 0 && (
                  <Text style={styles.count}>
                    {pendingCount}{" "}
                    {pendingCount === 1 ? "pendente" : "pendentes"}
                  </Text>
                )}
              </View>
              <View style={styles.inputRow}>
                <TextInput
                  accessibilityLabel="Nova tarefa"
                  style={styles.input}
                  maxLength={120}
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={create}
                  submitBehavior="submit"
                  returnKeyType="done"
                  placeholder="+  Nova tarefa"
                  placeholderTextColor={colors.muted}
                />
                {draft.trim().length > 0 && (
                  <Pressable
                    style={styles.addButton}
                    onPress={create}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Adicionar tarefa"
                  >
                    <Text style={styles.addButtonText}>＋</Text>
                  </Pressable>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              Nenhuma tarefa ainda. Digite acima para criar a primeira.
            </Text>
          }
        />
      </View>
      <ConfirmModal
        visible={taskToDelete != null}
        title="Excluir tarefa?"
        message={
          taskToDelete
            ? `"${taskToDelete.description}" vai sumir da sua lista.`
            : ""
        }
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        onCancel={() => setTaskToDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  wrapper: {
    flex: 1,
    width: "90%",
    maxWidth: 480,
  },
  header: {
    gap: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: "bold",
  },
  count: {
    color: colors.muted,
    fontSize: fontSizes.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceTranslucent,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: colors.text,
    fontSize: fontSizes.md,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  addButtonText: {
    color: colors.background,
    fontSize: fontSizes.md,
    fontWeight: "bold",
    lineHeight: 18,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.surface,
  },
  empty: {
    color: colors.muted,
    fontSize: fontSizes.md,
    textAlign: "center",
    marginTop: 40,
  },
});
