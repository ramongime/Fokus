import { fireEvent, render } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import History from "../app/history";
import useSettingsContext from "../components/context/useSettingsContext";
import useTimerContext from "../components/context/useTimerContext";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
}));

jest.mock("../components/context/useTimerContext", () => jest.fn());
jest.mock("../components/context/useSettingsContext", () => jest.fn());

describe("History screen", () => {
  const MOCK_NOW = new Date("2026-11-12T12:00:00Z").getTime();
  const mockHistory = {
    "2026-11-12": { count: 3, minutes: 75 },
    "2026-11-11": { count: 2, minutes: 50 },
    "2026-10-15": { count: 4, minutes: 100 },
  };

  const mockSettings = {
    dailyFocusGoal: 4,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useLocalSearchParams.mockReturnValue({});
    useTimerContext.mockReturnValue({
      history: mockHistory,
      clock: MOCK_NOW,
    });
    useSettingsContext.mockReturnValue({
      settings: mockSettings,
    });
  });

  it("renders week view by default with summary tiles and week chart", async () => {
    const { getByText, getAllByText } = await render(<History />);

    expect(getAllByText("Histórico").length).toBeGreaterThanOrEqual(1);
    expect(getByText("Focos na semana")).toBeTruthy();
    expect(getByText("Focos por dia")).toBeTruthy();
    expect(getByText("Últimos 7 dias")).toBeTruthy();
    expect(getByText("Semana")).toBeTruthy();
    expect(getByText("Mês e metas")).toBeTruthy();
  });

  it("respects view=month route parameter", async () => {
    useLocalSearchParams.mockReturnValue({ view: "month" });

    const { getByText, queryByText } = await render(<History />);

    expect(getByText("Focos no mês")).toBeTruthy();
    expect(getByText(/novembro 2026/i)).toBeTruthy();
    expect(queryByText("Focos por dia")).toBeNull();
  });

  it("allows switching between Semana and Mês e metas tabs", async () => {
    const { getByText, queryByText } = await render(<History />);

    expect(getByText("Focos na semana")).toBeTruthy();

    await fireEvent.press(getByText("Mês e metas"));
    expect(getByText("Focos no mês")).toBeTruthy();
    expect(getByText(/novembro 2026/i)).toBeTruthy();
    expect(queryByText("Focos por dia")).toBeNull();

    await fireEvent.press(getByText("Semana"));
    expect(getByText("Focos na semana")).toBeTruthy();
    expect(getByText("Focos por dia")).toBeTruthy();
  });

  it("safely falls back to today when selectedKey is outside the current week", async () => {
    const { getByText, getAllByText } = await render(<History />);

    // Alterna para o mês
    await fireEvent.press(getByText("Mês e metas"));
    expect(getByText(/novembro 2026/i)).toBeTruthy();

    // Volta para a semana; o gráfico e o detalhe devem destacar 'Hoje' de forma consistente
    await fireEvent.press(getByText("Semana"));
    expect(getByText("Focos por dia")).toBeTruthy();
    expect(getAllByText(/Hoje/).length).toBeGreaterThanOrEqual(2);
  });
});
