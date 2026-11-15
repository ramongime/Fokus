import { fireEvent, render } from "@testing-library/react-native";
import Pomodoro from "../app/pomodoro";
import { pomodoro } from "../constants/pomodoro";
import useSettingsContext from "../components/context/useSettingsContext";
import useTaskContext from "../components/context/useTaskContext";
import useTimerContext from "../components/context/useTimerContext";

const mockSetOptions = jest.fn();
jest.mock("expo-router", () => ({
  useNavigation: () => ({ setOptions: mockSetOptions }),
}));

jest.mock("../components/context/useTimerContext", () => jest.fn());
jest.mock("../components/context/useSettingsContext", () => jest.fn());
jest.mock("../components/context/useTaskContext", () => jest.fn());

const [focus, short, long] = pomodoro;
const settings = {
  longBreakInterval: 4,
  durations: { focus: 25, short: 5, long: 15 },
};

const mockTimer = (overrides) => {
  const toggleTimerType = jest.fn();
  useTimerContext.mockReturnValue({
    timerType: focus,
    seconds: 1500,
    timerRunning: false,
    todayCount: 1,
    currentTask: null,
    setCurrentTaskId: jest.fn(),
    toggleTimer: jest.fn(),
    toggleTimerType,
    ...overrides,
  });
  return toggleTimerType;
};

describe("Pomodoro screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSettingsContext.mockReturnValue({ settings });
    useTaskContext.mockReturnValue({ tasks: [], addTask: jest.fn() });
  });

  it("shows the focus position in the series instead of phase tabs", async () => {
    mockTimer({ todayCount: 1 });
    const { getByText, queryByText } = await render(<Pomodoro />);

    expect(getByText("Foco · 2 de 4")).toBeTruthy();
    expect(getByText("25:00")).toBeTruthy();
    expect(queryByText("Pausa curta")).toBeNull();
  });

  it("skips from focus to the short break", async () => {
    const toggleTimerType = mockTimer({ todayCount: 1 });
    const { getByText } = await render(<Pomodoro />);

    await fireEvent.press(getByText("Pular para a pausa"));
    expect(toggleTimerType).toHaveBeenCalledWith(short);
  });

  it("skips the last focus of the series to the long break", async () => {
    const toggleTimerType = mockTimer({ todayCount: 3 });
    const { getByText } = await render(<Pomodoro />);

    await fireEvent.press(getByText("Pular para a pausa"));
    expect(toggleTimerType).toHaveBeenCalledWith(long);
  });

  it("skips from a break back to focus and tints the header", async () => {
    const toggleTimerType = mockTimer({ timerType: short, seconds: 300 });
    const { getByText } = await render(<Pomodoro />);

    expect(getByText("Pausa curta")).toBeTruthy();
    await fireEvent.press(getByText("Pular para o foco"));
    expect(toggleTimerType).toHaveBeenCalledWith(focus);
    expect(mockSetOptions).toHaveBeenCalledWith({
      headerStyle: { backgroundColor: "#02191C" },
    });
  });
});
