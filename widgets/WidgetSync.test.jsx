import { render } from "@testing-library/react-native";
import { Platform } from "react-native";
import { pomodoro } from "../constants/pomodoro";
import useSettingsContext from "../components/context/useSettingsContext";
import useTimerContext from "../components/context/useTimerContext";
import FokusWidget from "./FokusWidget";
import WidgetSync from "./WidgetSync";

jest.mock("./FokusWidget", () => ({
  updateSnapshot: jest.fn(),
  updateTimeline: jest.fn(),
}));
jest.mock("../components/context/useTimerContext", () => jest.fn());
jest.mock("../components/context/useSettingsContext", () => jest.fn());

const [focus] = pomodoro;
const history = {};
const settings = {
  longBreakInterval: 4,
  dailyFocusGoal: 8,
  durations: { focus: 25, short: 5, long: 15 },
};

const mockTimer = (overrides) =>
  useTimerContext.mockReturnValue({
    timerType: focus,
    seconds: 1500,
    timerRunning: false,
    todayCount: 5,
    seriesCount: 5,
    segments: null,
    history,
    ...overrides,
  });

describe("WidgetSync", () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 25, 22, 0));
    useSettingsContext.mockReturnValue({ settings, isLoaded: true });
  });

  afterEach(() => {
    Platform.OS = originalOS;
    jest.useRealTimers();
  });

  it("agenda no iOS a virada do dia com o contador zerado", async () => {
    Platform.OS = "ios";
    mockTimer();
    await render(<WidgetSync />);

    const timeline = FokusWidget.updateTimeline.mock.calls.at(-1)[0];
    expect(timeline.map((entry) => entry.props.focusCount)).toEqual([5, 0]);
    expect(timeline[1].date.getTime()).toBe(new Date(2026, 10, 26).getTime());
  });

  it("não atualiza o widget a cada segundo enquanto o timer roda", async () => {
    Platform.OS = "android";
    const segments = [
      { typeId: "focus", endTime: Date.now() + 20 * 60 * 1000 + 30 * 1000 },
    ];
    mockTimer({ timerRunning: true, seconds: 1230, segments });
    const { rerender } = await render(<WidgetSync />);
    expect(FokusWidget.updateSnapshot).toHaveBeenCalledTimes(1);

    mockTimer({ timerRunning: true, seconds: 1229, segments });
    await rerender(<WidgetSync />);
    expect(FokusWidget.updateSnapshot).toHaveBeenCalledTimes(1);

    mockTimer({ timerRunning: true, seconds: 1200, segments });
    await rerender(<WidgetSync />);
    expect(FokusWidget.updateSnapshot).toHaveBeenCalledTimes(2);
  });
});
