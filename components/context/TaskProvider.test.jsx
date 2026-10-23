import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { TasksProvider } from "./TaskProvider";
import useTaskContext from "./useTaskContext";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(() => Promise.resolve()),
}));

describe("TasksProvider & useTaskContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws descriptive error when useTaskContext is used outside TasksProvider", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(renderHook(() => useTaskContext())).rejects.toThrow(
      "Tentando acessar o contexto fora do TasksProvider",
    );

    errorSpy.mockRestore();
  });

  it("hydrates with empty tasks list when AsyncStorage is empty", async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);

    const { result } = await renderHook(() => useTaskContext(), {
      wrapper: ({ children }) => <TasksProvider>{children}</TasksProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.tasks).toEqual([]);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith("fokus-tasks");
  });

  it("hydrates tasks and coerces legacy numeric IDs to strings", async () => {
    const legacyTasks = [
      { id: 101, description: "Legacy Task 1", completed: false },
      { id: "202", description: "String Task 2", pomodoros: 3 },
    ];
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(legacyTasks));

    const { result } = await renderHook(() => useTaskContext(), {
      wrapper: ({ children }) => <TasksProvider>{children}</TasksProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.tasks).toHaveLength(2);
    expect(result.current.tasks[0].id).toBe("101");
    expect(result.current.tasks[1].id).toBe("202");
  });

  it("keeps isLoaded false and prevents disk overwrite when loading throws", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    AsyncStorage.getItem.mockRejectedValueOnce(new Error("Storage corrupted"));

    const { result } = await renderHook(() => useTaskContext(), {
      wrapper: ({ children }) => <TasksProvider>{children}</TasksProvider>,
    });

    // Wait a tick for async error catch to execute
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(result.current.isLoaded).toBe(false);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      "Erro ao carregar tarefas",
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });

  it("respects the storage mount barrier and persists task changes to AsyncStorage", async () => {
    AsyncStorage.getItem.mockResolvedValueOnce(null);

    const { result } = await renderHook(() => useTaskContext(), {
      wrapper: ({ children }) => <TasksProvider>{children}</TasksProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    AsyncStorage.setItem.mockClear();

    await act(() => {
      result.current.addTask("Nova tarefa de teste");
    });

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "fokus-tasks",
        expect.stringContaining("Nova tarefa de teste"),
      );
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].description).toBe("Nova tarefa de teste");
    expect(typeof result.current.tasks[0].id).toBe("string");
  });

  it("handles toggleTaskCompleted correctly", async () => {
    const initialTasks = [
      { id: "1", description: "Task 1", completed: false },
      { id: "2", description: "Task 2", completed: true },
    ];
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(initialTasks));

    const { result } = await renderHook(() => useTaskContext(), {
      wrapper: ({ children }) => <TasksProvider>{children}</TasksProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(() => {
      result.current.toggleTaskCompleted("1");
    });
    expect(result.current.tasks.find((t) => t.id === "1")?.completed).toBe(
      true,
    );
    expect(result.current.tasks.find((t) => t.id === "2")?.completed).toBe(
      true,
    );

    await act(() => {
      result.current.toggleTaskCompleted("1");
    });
    expect(result.current.tasks.find((t) => t.id === "1")?.completed).toBe(
      false,
    );
  });

  it("handles updateTask and deleteTask correctly", async () => {
    const initialTasks = [
      { id: "10", description: "Original title" },
      { id: "20", description: "To be deleted" },
    ];
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(initialTasks));

    const { result } = await renderHook(() => useTaskContext(), {
      wrapper: ({ children }) => <TasksProvider>{children}</TasksProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(() => {
      result.current.updateTask("10", "Updated title");
    });
    expect(result.current.tasks.find((t) => t.id === "10")?.description).toBe(
      "Updated title",
    );

    await act(() => {
      result.current.deleteTask("20");
    });
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks.find((t) => t.id === "20")).toBeUndefined();
  });

  it("handles addPomodorosToTask correctly including undefined initial count", async () => {
    const initialTasks = [
      { id: "task-a", description: "Sem pomodoros ainda" },
      { id: "task-b", description: "Com 2 pomodoros", pomodoros: 2 },
    ];
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(initialTasks));

    const { result } = await renderHook(() => useTaskContext(), {
      wrapper: ({ children }) => <TasksProvider>{children}</TasksProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(() => {
      result.current.addPomodorosToTask("task-a", 1);
    });
    expect(result.current.tasks.find((t) => t.id === "task-a")?.pomodoros).toBe(
      1,
    );

    await act(() => {
      result.current.addPomodorosToTask("task-b", 3);
    });
    expect(result.current.tasks.find((t) => t.id === "task-b")?.pomodoros).toBe(
      5,
    );
  });

  it("logs warning if AsyncStorage.setItem fails during storage write", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    AsyncStorage.getItem.mockResolvedValueOnce(null);
    AsyncStorage.setItem.mockRejectedValue(new Error("Write error"));

    const { result } = await renderHook(() => useTaskContext(), {
      wrapper: ({ children }) => <TasksProvider>{children}</TasksProvider>,
    });

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(() => {
      result.current.addTask("Falha ao salvar");
    });

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        "Erro ao salvar tarefas",
        expect.any(Error),
      );
    });

    warnSpy.mockRestore();
  });
});
