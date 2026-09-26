import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import useTaskContext from "../../components/context/useTaskContext";
import FormTask from "../../components/FormTask";

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
      <View>
        <Text>Não foi encontrada uma tarefa com o id: {id}</Text>
      </View>
    );
  }

  return <FormTask defaultValue={task.description} onFormSubmit={submitTask} />;
}
