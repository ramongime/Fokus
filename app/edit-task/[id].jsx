import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import useTaskContext from "../../components/context/useTaskContext";
import FormTask from "../../components/FormTask";
import { colors, fontSizes } from "../../constants/theme";

export default function EditTask() {
  const { id } = useLocalSearchParams();
  const { tasks, updateTask } = useTaskContext();

  const task = tasks.find((t) => t.id === id);

  const submitTask = (description) => {
    updateTask(id, description);
    router.navigate("/tasks");
  };

  if (!task) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Essa tarefa não existe mais.</Text>
      </View>
    );
  }

  return <FormTask defaultValue={task.description} onFormSubmit={submitTask} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
  },
  notFound: {
    color: colors.muted,
    fontSize: fontSizes.md,
    textAlign: "center",
    marginTop: 40,
  },
});
