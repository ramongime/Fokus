import { render } from "@testing-library/react-native";
import { getCounterSeries, PomodoroCounter } from "./index";

describe("getCounterSeries", () => {
  it("mostra uma série vazia quando ainda não houve foco", () => {
    expect(getCounterSeries(0, 4)).toEqual([0]);
  });

  it("mantém uma série cheia ao completar a pausa longa", () => {
    expect(getCounterSeries(4, 4)).toEqual([4]);
  });

  it("abre uma nova série a cada foco além do intervalo", () => {
    expect(getCounterSeries(5, 4)).toEqual([4, 1]);
    expect(getCounterSeries(10, 4)).toEqual([4, 4, 2]);
  });

  it("tolera valores inválidos", () => {
    expect(getCounterSeries(-3, 4)).toEqual([0]);
    expect(getCounterSeries(3, 0)).toEqual([1, 1, 1]);
  });
});

describe("PomodoroCounter", () => {
  it("preenche uma bolinha para cada foco do dia, sem limitar a 4", async () => {
    const { getAllByTestId, getByText } = await render(
      <PomodoroCounter count={6} longBreakInterval={4} />,
    );

    expect(getAllByTestId("pomodoro-counter-dot-filled")).toHaveLength(6);
    expect(getAllByTestId("pomodoro-counter-dot")).toHaveLength(2);
    expect(getAllByTestId("pomodoro-counter-series")).toHaveLength(2);
    expect(getByText("🍅 6 focos hoje")).toBeTruthy();
  });

  it("começa o dia com a série vazia", async () => {
    const { queryAllByTestId, getAllByTestId } = await render(
      <PomodoroCounter count={0} longBreakInterval={4} />,
    );

    expect(queryAllByTestId("pomodoro-counter-dot-filled")).toHaveLength(0);
    expect(getAllByTestId("pomodoro-counter-dot")).toHaveLength(4);
  });
});
