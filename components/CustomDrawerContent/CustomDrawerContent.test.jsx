import { fireEvent, render } from "@testing-library/react-native";
import { CustomDrawerContent } from "./index";

jest.mock("@expo/vector-icons", () => ({
  Feather: "Feather",
}));

jest.mock("expo-router/drawer", () => ({
  DrawerContentScrollView: ({ children, ...props }) => (
    <mock-scroll-view {...props}>{children}</mock-scroll-view>
  ),
}));

describe("CustomDrawerContent", () => {
  const mockNavigation = {
    navigate: jest.fn(),
    closeDrawer: jest.fn(),
  };

  const mockState = {
    index: 0,
    routes: [
      { key: "pomodoro-key", name: "pomodoro" },
      { key: "tasks-key", name: "tasks/index" },
      { key: "hidden-key", name: "add-task/index" },
      { key: "history-key", name: "history" },
      { key: "settings-key", name: "settings" },
    ],
  };

  const mockDescriptors = {
    "pomodoro-key": {
      options: { drawerLabel: "Timer" },
    },
    "tasks-key": {
      options: { drawerLabel: "Tarefas" },
    },
    "hidden-key": {
      options: { drawerItemStyle: { display: "none" } },
    },
    "history-key": {
      options: { drawerLabel: "Histórico" },
    },
    "settings-key": {
      options: { drawerLabel: "Configurações" },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders visible routes and excludes hidden ones", async () => {
    const { getByText, queryByText } = await render(
      <CustomDrawerContent
        state={mockState}
        navigation={mockNavigation}
        descriptors={mockDescriptors}
        todayCount={2}
        dailyGoal={4}
        timerRunning={false}
      />,
    );

    expect(getByText("Timer")).toBeTruthy();
    expect(getByText("Tarefas")).toBeTruthy();
    expect(getByText("Histórico")).toBeTruthy();
    expect(getByText("Configurações")).toBeTruthy();
    expect(queryByText("add-task/index")).toBeNull();
  });

  it("shows idle status when timer is not running", async () => {
    const { getByText } = await render(
      <CustomDrawerContent
        state={mockState}
        navigation={mockNavigation}
        descriptors={mockDescriptors}
        todayCount={0}
        dailyGoal={4}
        timerRunning={false}
      />,
    );

    expect(getByText("Pronto para focar")).toBeTruthy();
  });

  it("shows active status when timer is running", async () => {
    const { getByText } = await render(
      <CustomDrawerContent
        state={mockState}
        navigation={mockNavigation}
        descriptors={mockDescriptors}
        todayCount={1}
        dailyGoal={4}
        timerRunning={true}
      />,
    );

    expect(getByText("Ciclo em andamento")).toBeTruthy();
  });

  it("displays today's focus progress and version in footer", async () => {
    const { getByText } = await render(
      <CustomDrawerContent
        state={mockState}
        navigation={mockNavigation}
        descriptors={mockDescriptors}
        todayCount={3}
        dailyGoal={5}
        timerRunning={false}
      />,
    );

    expect(getByText("3/5 focos")).toBeTruthy();
    expect(getByText("Fokus • Offline-first")).toBeTruthy();
  });

  it("navigates to route when pressed", async () => {
    const { getByText } = await render(
      <CustomDrawerContent
        state={mockState}
        navigation={mockNavigation}
        descriptors={mockDescriptors}
        todayCount={0}
        dailyGoal={4}
        timerRunning={false}
      />,
    );

    await fireEvent.press(getByText("Tarefas"));
    expect(mockNavigation.navigate).toHaveBeenCalledWith("tasks/index");
  });
});
