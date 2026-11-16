import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ConfirmModal } from "../../components/ConfirmModal";
import useTaskContext from "../../components/context/useTaskContext";
import { FokusButton } from "../../components/FokusButton";
import FormTask from "../../components/FormTask";
import { colors, fontSizes } from "../../constants/theme";

export default function EditTask() {
  const { id } = useLocalSearchParams();
  const taskId = Array.isArray(id) ? id[0] : id;
  const { tasks, isLoaded, updateTask, deleteTask } = useTaskContext();
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  // Excluída por aqui: não mostra "não existe mais" enquanto volta para a lista
  const [deletedId, setDeletedId] = useState(null);

  const task = tasks.find((t) => t.id === taskId);
  const deleted = deletedId === taskId;
  const confirmingDelete = confirmingDeleteId === taskId;

  const submitTask = (description) => {
    if (!task) return;
    updateTask(task.id, description);
    router.navigate("/tasks");
  };

  const confirmDelete = () => {
    if (!task || deleted) return;
    setConfirmingDeleteId(null);
    setDeletedId(task.id);
    deleteTask(task.id);
    router.navigate("/tasks");
  };

  if (!isLoaded || (!task && deleted)) {
    return <View style={styles.blank} />;
  }

  if (!task) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Essa tarefa não existe mais.</Text>
        <View style={styles.actionWrapper}>
          <FokusButton
            title="Voltar para tarefas"
            outline
            onPress={() => router.navigate("/tasks")}
          />
        </View>
      </View>
    );
  }

  return (
    <>
      <FormTask
        key={task.id}
        defaultValue={task.description}
        onFormSubmit={submitTask}
        footer={
          <Pressable
            style={styles.deleteButton}
            onPress={() => setConfirmingDeleteId(task.id)}
            hitSlop={10}
            accessibilityRole="button"
          >
            <Text style={styles.deleteText}>Excluir tarefa</Text>
          </Pressable>
        }
      />
      <ConfirmModal
        visible={confirmingDelete}
        title="Excluir tarefa?"
        message={`"${task.description}" vai sumir da sua lista.`}
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDeleteId(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    alignItems: "center",
  },
  blank: {
    flex: 1,
    backgroundColor: colors.background,
  },
  notFound: {
    color: colors.muted,
    fontSize: fontSizes.md,
    textAlign: "center",
    marginTop: 40,
    marginBottom: 24,
  },
  deleteButton: {
    alignSelf: "center",
  },
  deleteText: {
    color: colors.danger,
    fontSize: fontSizes.md,
  },
  actionWrapper: {
    width: "100%",
    maxWidth: 280,
  },
});
