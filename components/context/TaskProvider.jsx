import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export const TaskContext = createContext();

const TASKS_STORAGE_KEY = "fokus-tasks";

const normalizeStoredTasks = (rawList) => {
  const seenIds = new Set();
  const normalized = [];

  for (const item of rawList) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    if (item.id == null) {
      continue;
    }
    const id = String(item.id).trim();
    if (!id || seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);

    const task = {
      id,
      description:
        typeof item.description === "string"
          ? item.description.slice(0, 120)
          : "",
    };
    if (item.completed !== undefined) {
      task.completed = Boolean(item.completed);
    }
    if (item.pomodoros !== undefined) {
      task.pomodoros =
        typeof item.pomodoros === "number" &&
        Number.isFinite(item.pomodoros) &&
        item.pomodoros >= 0
          ? Math.floor(item.pomodoros)
          : 0;
    }
    normalized.push(task);
  }
  return normalized;
};

export function TasksProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const lastIdRef = useRef(0);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
        let parsed = [];
        if (jsonValue != null) {
          try {
            parsed = JSON.parse(jsonValue);
          } catch (parseError) {
            console.warn(
              "Tarefas salvas inválidas, iniciando vazio",
              parseError,
            );
          }
        }
        const loadedData = Array.isArray(parsed) ? parsed : [];
        // Tarefas antigas foram salvas com id numérico
        const normalized = normalizeStoredTasks(loadedData);
        for (const task of normalized) {
          const numericId = Number(task.id);
          if (Number.isFinite(numericId) && numericId > lastIdRef.current) {
            lastIdRef.current = numericId;
          }
        }
        setTasks(normalized);
        setIsLoaded(true);
      } catch (e) {
        // Sem isLoaded, nada é gravado e as tarefas salvas não são sobrescritas
        console.warn("Erro ao carregar tarefas", e);
      }
    };
    loadTasks();
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

  // Devolve o id para quem cria já poder vincular a tarefa (ex.: ao foco atual)
  const addTask = useCallback((description) => {
    const clean = description?.trim().slice(0, 120);
    if (!clean) return null;
    const candidate = Math.max(Date.now(), lastIdRef.current + 1);
    lastIdRef.current = candidate;
    const id = String(candidate);
    setTasks((oldState) => [
      ...oldState,
      {
        description: clean,
        id,
      },
    ]);
    return id;
  }, []);

  const toggleTaskCompleted = useCallback((id) => {
    setTasks((oldState) =>
      oldState.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t,
      ),
    );
  }, []);

  const updateTask = useCallback((id, description) => {
    const clean = description?.trim().slice(0, 120);
    if (!clean) return;
    setTasks((oldState) =>
      oldState.map((t) => (t.id === id ? { ...t, description: clean } : t)),
    );
  }, []);

  const addPomodorosToTask = useCallback((id, amount) => {
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return;
    }
    setTasks((oldState) =>
      oldState.map((t) =>
        t.id === id
          ? {
              ...t,
              pomodoros:
                (typeof t.pomodoros === "number" &&
                Number.isFinite(t.pomodoros) &&
                t.pomodoros >= 0
                  ? t.pomodoros
                  : 0) + amount,
            }
          : t,
      ),
    );
  }, []);

  const deleteTask = useCallback((id) => {
    setTasks((oldState) => oldState.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      tasks,
      isLoaded,
      addTask,
      toggleTaskCompleted,
      updateTask,
      deleteTask,
      addPomodorosToTask,
    }),
    [
      tasks,
      isLoaded,
      addTask,
      toggleTaskCompleted,
      updateTask,
      deleteTask,
      addPomodorosToTask,
    ],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}
