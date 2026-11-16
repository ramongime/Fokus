import { fireEvent, render } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";
import EditTask from "../app/edit-task/[id]";
import useTaskContext from "../components/context/useTaskContext";

jest.mock("expo-router", () => ({
  router: { navigate: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock("../components/context/useTaskContext", () => jest.fn());

describe("EditTask screen", () => {
  const tasks = [
    { id: "1", description: "Primeira tarefa" },
    { id: "2", description: "Segunda tarefa" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useTaskContext.mockReturnValue({
      tasks,
      isLoaded: true,
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
    });
  });

  it("resets form and deleted state when switching between task IDs in the drawer", async () => {
    useLocalSearchParams.mockReturnValue({ id: "1" });
    const { getByDisplayValue, getByText, rerender } = await render(
      <EditTask />,
    );

    expect(getByDisplayValue("Primeira tarefa")).toBeTruthy();

    await fireEvent.press(getByText("Excluir tarefa"));
    await fireEvent.press(getByText("Excluir"));
    expect(router.navigate).toHaveBeenCalledWith("/tasks");

    useLocalSearchParams.mockReturnValue({ id: "2" });
    await rerender(<EditTask />);

    expect(getByDisplayValue("Segunda tarefa")).toBeTruthy();
  });

  it("waits until tasks finish loading before showing the not-found message", async () => {
    useLocalSearchParams.mockReturnValue({ id: "1" });
    useTaskContext.mockReturnValue({
      tasks: [],
      isLoaded: false,
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
    });

    const { queryByText } = await render(<EditTask />);
    expect(queryByText("Essa tarefa não existe mais.")).toBeNull();
  });
});
