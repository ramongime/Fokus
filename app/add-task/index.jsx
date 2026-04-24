import { router } from "expo-router";
import FormTask from "../../components/FormTask";
import useTaskContext from "../../components/context/useTaskContext";

export default function AddTask() {
  const { addTask } = useTaskContext();

  const submitTask = (description) => {
    addTask(description);
    router.navigate("/tasks");
  };

  return <FormTask onFormSubmit={submitTask} />;
}
