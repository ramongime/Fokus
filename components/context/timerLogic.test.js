import {
  addFocusCompletions,
  buildPlan,
  countFinishedSegments,
  formatSeconds,
  getNextTypeId,
  getRemainingSeconds,
  getSegmentNotification,
  getTodayCount,
  MAX_PLANNED_SEGMENTS,
  normalizeSettings,
  todayKey,
} from "./timerLogic";
import { DEFAULT_SETTINGS } from "../../constants/settings";

const settings = {
  autoStartCycles: true,
  longBreakInterval: 4,
  durations: { focus: 25, short: 5, long: 15 },
};

const NOW = new Date(2026, 8, 26, 14, 0, 0).getTime();
const MIN = 60 * 1000;

describe("getNextTypeId", () => {
  it("volta para o foco depois de qualquer pausa", () => {
    expect(getNextTypeId("short", 1, settings)).toBe("focus");
    expect(getNextTypeId("long", 4, settings)).toBe("focus");
  });

  it("sugere pausa curta entre os focos e longa a cada intervalo", () => {
    expect(getNextTypeId("focus", 1, settings)).toBe("short");
    expect(getNextTypeId("focus", 3, settings)).toBe("short");
    expect(getNextTypeId("focus", 4, settings)).toBe("long");
    expect(getNextTypeId("focus", 8, settings)).toBe("long");
  });

  it("respeita o intervalo configurado", () => {
    const custom = { ...settings, longBreakInterval: 2 };
    expect(getNextTypeId("focus", 2, custom)).toBe("long");
    expect(getNextTypeId("focus", 3, custom)).toBe("short");
  });
});

describe("buildPlan", () => {
  it("planeja só o ciclo atual quando emendar está desligado", () => {
    const plan = buildPlan({
      typeId: "focus",
      seconds: 25 * 60,
      now: NOW,
      focusCount: 0,
      settings: { ...settings, autoStartCycles: false },
    });
    expect(plan).toEqual([{ typeId: "focus", endTime: NOW + 25 * MIN }]);
  });

  it("emenda foco e pausas com a pausa longa no 4º foco", () => {
    const plan = buildPlan({
      typeId: "focus",
      seconds: 25 * 60,
      now: NOW,
      focusCount: 0,
      settings,
    });
    expect(plan).toHaveLength(MAX_PLANNED_SEGMENTS);
    expect(plan.map((s) => s.typeId)).toEqual([
      "focus",
      "short",
      "focus",
      "short",
      "focus",
      "short",
      "focus",
      "long",
    ]);
    expect(plan[1].endTime).toBe(NOW + 30 * MIN);
    expect(plan[7].endTime).toBe(NOW + (25 * 4 + 5 * 3 + 15) * MIN);
  });

  it("considera os focos que já foram feitos hoje", () => {
    const plan = buildPlan({
      typeId: "focus",
      seconds: 25 * 60,
      now: NOW,
      focusCount: 3,
      settings,
    });
    expect(plan[1].typeId).toBe("long");
  });

  it("usa o tempo restante do ciclo pausado e as durações configuradas", () => {
    const plan = buildPlan({
      typeId: "short",
      seconds: 90,
      now: NOW,
      focusCount: 1,
      settings: { ...settings, durations: { focus: 50, short: 10, long: 30 } },
    });
    expect(plan[0].endTime).toBe(NOW + 90 * 1000);
    expect(plan[1]).toEqual({
      typeId: "focus",
      endTime: NOW + 90 * 1000 + 50 * MIN,
    });
  });
});

describe("tempo e contagem", () => {
  it("arredonda o tempo restante para cima e nunca fica negativo", () => {
    expect(getRemainingSeconds(NOW + 1500, NOW)).toBe(2);
    expect(getRemainingSeconds(NOW - 5000, NOW)).toBe(0);
  });

  it("conta os ciclos que já terminaram", () => {
    const plan = buildPlan({
      typeId: "focus",
      seconds: 60,
      now: NOW,
      focusCount: 0,
      settings,
    });
    expect(countFinishedSegments(plan, NOW)).toBe(0);
    expect(countFinishedSegments(plan, NOW + 60 * 1000)).toBe(1);
    expect(countFinishedSegments(plan, NOW + 7 * MIN)).toBe(2);
  });

  it("zera o contador do dia quando a data muda", () => {
    const stats = { date: todayKey(NOW), count: 3 };
    const tomorrow = NOW + 24 * 60 * MIN;
    expect(getTodayCount(stats, NOW)).toBe(3);
    expect(getTodayCount(stats, tomorrow)).toBe(0);
    expect(addFocusCompletions(stats, 2, NOW)).toEqual({
      date: todayKey(NOW),
      count: 5,
    });
    expect(addFocusCompletions(stats, 1, tomorrow)).toEqual({
      date: todayKey(tomorrow),
      count: 1,
    });
  });

  it("formata minutos e segundos, inclusive acima de uma hora", () => {
    expect(formatSeconds(25 * 60)).toBe("25:00");
    expect(formatSeconds(65)).toBe("01:05");
    expect(formatSeconds(90 * 60)).toBe("90:00");
  });
});

describe("getSegmentNotification", () => {
  const plan = buildPlan({
    typeId: "focus",
    seconds: 60,
    now: NOW,
    focusCount: 0,
    settings,
  });

  it("avisa qual ciclo começou quando os ciclos emendam", () => {
    expect(getSegmentNotification(plan, 0, settings)).toEqual({
      title: "Foco concluído! 🍅",
      body: "Pausa curta começou: 5 min.",
    });
  });

  it("cita a tarefa no fim de um foco", () => {
    const task = { description: "Estudar React Native" };
    expect(getSegmentNotification(plan, 0, settings, task).body).toBe(
      "Tarefa: Estudar React Native. Pausa curta começou: 5 min.",
    );
    expect(getSegmentNotification(plan, 1, settings, task).body).toBe(
      "Foco começou: 25 min.",
    );
  });

  it("usa o texto padrão no último ciclo", () => {
    const single = [{ typeId: "short", endTime: NOW }];
    expect(getSegmentNotification(single, 0, settings)).toEqual({
      title: "Pausa curta encerrada",
      body: "Bora voltar para o foco!",
    });
  });
});

describe("normalizeSettings", () => {
  it("usa os padrões quando não há nada salvo", () => {
    expect(normalizeSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("mantém valores válidos e corrige os inválidos", () => {
    expect(
      normalizeSettings({
        autoStartCycles: false,
        longBreakInterval: 99,
        durations: { focus: 50, short: 0, long: "abc", extra: 3 },
      }),
    ).toEqual({
      autoStartCycles: false,
      longBreakInterval: 8,
      durations: { focus: 50, short: 5, long: 15 },
    });
  });
});
