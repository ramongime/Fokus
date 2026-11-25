import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import Tasks from "../app/tasks";
import useTaskContext from "../components/context/useTaskContext";

jest.mock("expo-router", () => ({ router: { navigate: jest.fn() } }));
jest.mock("../components/context/useTaskContext", () => jest.fn());
// O gesto de deslizar depende do Reanimated nativo, que não roda no Jest
jest.mock(
  "react-native-gesture-handler/ReanimatedSwipeable",
  () =>
    ({ children }) =>
      children,
);

const tasks = [
  { id: "1", description: "Ler", completed: false, pomodoros: 2 },
  { id: "2", description: "Revisar PR", completed: true, pomodoros: 0 },
];

const mockTasks = () => {
  const handlers = {
    addTask: jest.fn(),
    deleteTask: jest.fn(),
    toggleTaskCompleted: jest.fn(),
  };
  useTaskContext.mockReturnValue({ tasks, ...handlers });
  return handlers;
};

describe("Tasks screen", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lista as tarefas e conta as pendentes", async () => {
    mockTasks();
    const { getByText } = await render(<Tasks />);

    expect(getByText("Ler")).toBeTruthy();
    expect(getByText("Revisar PR")).toBeTruthy();
    expect(getByText("1 pendente")).toBeTruthy();
  });

  it("conclui, edita e exclui pela tarefa certa", async () => {
    const { toggleTaskCompleted, deleteTask } = mockTasks();
    const { getByLabelText, getByText } = await render(<Tasks />);

    await fireEvent.press(getByLabelText('Concluir "Ler"'));
    expect(toggleTaskCompleted).toHaveBeenCalledWith("1");

    await fireEvent.press(getByText("Revisar PR"));
    expect(router.navigate).toHaveBeenCalledWith("/edit-task/2");

    await fireEvent(getByLabelText('Editar "Ler"'), "accessibilityAction", {
      nativeEvent: { actionName: "delete" },
    });
    expect(getByText('"Ler" vai sumir da sua lista.')).toBeTruthy();
    await fireEvent.press(getByText("Excluir"));
    expect(deleteTask).toHaveBeenCalledWith("1");
  });
});
