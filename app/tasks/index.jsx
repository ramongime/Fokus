import { router } from "expo-router";
import { useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { ConfirmModal } from "../../components/ConfirmModal";
import useTaskContext from "../../components/context/useTaskContext";
import { FokusButton } from "../../components/FokusButton";
import { IconPlus } from "../../components/Icons";
import TaskItem from "../../components/TaskItem";
import { colors, fontSizes } from "../../constants/theme";

export default function Tasks() {
  const { tasks, deleteTask, toggleTaskCompleted } = useTaskContext();
  const [taskToDelete, setTaskToDelete] = useState(null);

  const confirmDelete = () => {
    deleteTask(taskToDelete.id);
    setTaskToDelete(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.wrapper}>
        <View style={styles.inner}>
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
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListHeaderComponent={
              <Text style={styles.text}>Lista de tarefas:</Text>
            }
            ListFooterComponent={
              <View style={{ marginTop: 16 }}>
                <FokusButton
                  title="Adicionar nova tarefa"
                  icon={<IconPlus outline />}
                  outline
                  onPress={() => router.navigate("/add-task")}
                />
              </View>
            }
            ListEmptyComponent={
              <Text style={styles.empty}>
                Ainda não há tarefas na sua lista, que tal adicionar uma?
              </Text>
            }
          />
        </View>
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
    gap: 40,
    width: "90%",
  },
  text: {
    textAlign: "center",
    color: colors.text,
    fontSize: fontSizes.lg,
    margin: 16,
  },
  inner: {
    gap: 8,
  },
  empty: {
    color: colors.muted,
    fontSize: fontSizes.md,
    textAlign: "center",
    marginTop: 40,
    marginBottom: 24,
  },
});
