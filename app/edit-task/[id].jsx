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
  const { tasks, updateTask, deleteTask } = useTaskContext();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Excluída por aqui: não mostra "não existe mais" enquanto volta para a lista
  const [deleted, setDeleted] = useState(false);

  const task = tasks.find((t) => t.id === id);

  const submitTask = (description) => {
    updateTask(id, description);
    router.navigate("/tasks");
  };

  const confirmDelete = () => {
    setConfirmingDelete(false);
    setDeleted(true);
    deleteTask(id);
    router.navigate("/tasks");
  };

  if (!task && deleted) {
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
        defaultValue={task.description}
        onFormSubmit={submitTask}
        footer={
          <Pressable
            style={styles.deleteButton}
            onPress={() => setConfirmingDelete(true)}
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
        onCancel={() => setConfirmingDelete(false)}
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
