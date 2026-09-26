import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useEffect, useState } from "react";

export const TaskContext = createContext();

const TASKS_STORAGE_KEY = "fokus-tasks";

export function TasksProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const getData = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
        const loadedData = jsonValue != null ? JSON.parse(jsonValue) : [];
        // Tarefas antigas foram salvas com id numérico
        setTasks(loadedData.map((t) => ({ ...t, id: String(t.id) })));
        setIsLoaded(true);
      } catch (e) {
        // Sem isLoaded, nada é gravado e as tarefas salvas não são sobrescritas
        console.warn("Erro ao carregar tarefas", e);
      }
    };
    getData();
  }, []);

  useEffect(() => {
    const storeData = async (value) => {
      try {
        const jsonValue = JSON.stringify(value);
        await AsyncStorage.setItem(TASKS_STORAGE_KEY, jsonValue);
      } catch (e) {
        console.warn("Erro ao salvar tarefas", e);
      }
    };
    if (isLoaded) {
      storeData(tasks);
    }
  }, [tasks, isLoaded]);

  const addTask = (description) => {
    setTasks((oldState) => {
      return [
        ...oldState,
        {
          description,
          id: Date.now().toString(),
        },
      ];
    });
  };

  const toggleTaskCompleted = (id) => {
    setTasks((oldState) => {
      return oldState.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t,
      );
    });
  };

  const updateTask = (id, description) => {
    setTasks((oldState) => {
      return oldState.map((t) => (t.id === id ? { ...t, description } : t));
    });
  };

  const deleteTask = (id) => {
    setTasks((oldState) => {
      return oldState.filter((t) => t.id !== id);
    });
  };

  return (
    <TaskContext.Provider
      value={{
        tasks,
        addTask,
        toggleTaskCompleted,
        updateTask,
        deleteTask,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}
