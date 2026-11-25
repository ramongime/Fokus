import { fireEvent, render } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import History from "../app/history";
import useSettingsContext from "../components/context/useSettingsContext";
import useTaskContext from "../components/context/useTaskContext";
import useTimerSummary from "../components/context/useTimerSummary";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
}));

jest.mock("../components/context/useTimerSummary", () => jest.fn());
jest.mock("../components/context/useSettingsContext", () => jest.fn());
jest.mock("../components/context/useTaskContext", () => jest.fn());

describe("History screen", () => {
  const MOCK_NOW = new Date("2026-11-12T12:00:00Z").getTime();
  const mockHistory = {
    "2026-11-12": {
      count: 3,
      minutes: 75,
      tasks: { 1: { count: 2, minutes: 50 }, 9: { count: 1, minutes: 25 } },
    },
    "2026-11-11": { count: 2, minutes: 50 },
    "2026-10-15": { count: 4, minutes: 100 },
  };

  const mockSettings = {
    dailyFocusGoal: 4,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useLocalSearchParams.mockReturnValue({});
    useTimerSummary.mockReturnValue({
      history: mockHistory,
      clock: MOCK_NOW,
    });
    useSettingsContext.mockReturnValue({
      settings: mockSettings,
    });
    useTaskContext.mockReturnValue({
      tasks: [{ id: "1", description: "Estudar React" }],
    });
  });

  it("mostra o tempo focado por tarefa no período", async () => {
    const { getByText, getByLabelText } = await render(<History />);

    expect(getByText("Por tarefa")).toBeTruthy();
    expect(getByLabelText("Estudar React: 2 focos, 50 min")).toBeTruthy();
    // A tarefa 9 não existe mais; o dia 11 não tinha tarefa registrada
    expect(getByLabelText("Sem tarefa: 2 focos, 50 min")).toBeTruthy();
    expect(getByLabelText("Tarefa excluída: 1 foco, 25 min")).toBeTruthy();
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
