import { mergeTasks } from "./taskLogic";

describe("mergeTasks", () => {
  it("soma as novas e atualiza as de mesmo id sem perder focos", () => {
    const current = [
      { id: "1", description: "Ler", pomodoros: 5 },
      { id: "2", description: "Correr" },
    ];
    const incoming = [
      { id: "1", description: "Ler livro", pomodoros: 3, completed: true },
      { id: "3", description: "Nova" },
    ];
    expect(mergeTasks(current, incoming)).toEqual([
      { id: "1", description: "Ler livro", pomodoros: 5, completed: true },
      { id: "2", description: "Correr" },
      { id: "3", description: "Nova" },
    ]);
  });
});
