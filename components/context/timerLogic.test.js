import {
  addFocusToSeries,
  getSeriesCount,
  normalizeSeries,
  buildPlan,
  countFinishedSegments,
  formatSeconds,
  getNextTypeId,
  getRemainingSeconds,
  getSegmentMinutes,
  getSegmentNotification,
  MAX_PLANNED_SEGMENTS,
  normalizeSavedSegments,
  normalizeSettings,
  shouldVibrateInApp,
} from "./timerLogic";
import { DEFAULT_SETTINGS } from "../../constants/settings";

const settings = {
  autoStartCycles: true,
  vibrate: true,
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
    expect(plan).toEqual([
      { typeId: "focus", startTime: NOW, endTime: NOW + 25 * MIN },
    ]);
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
      startTime: NOW + 90 * 1000,
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

  it("calcula os minutos focados de cada ciclo", () => {
    const plan = buildPlan({
      typeId: "focus",
      seconds: 25 * 60,
      now: NOW,
      focusCount: 0,
      settings,
    });
    expect(getSegmentMinutes(plan[0], settings)).toBe(25);
    expect(getSegmentMinutes(plan[1], settings)).toBe(5);
    expect(getSegmentMinutes({ typeId: "focus", endTime: NOW }, settings)).toBe(
      25,
    );
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

  it("trunca a descrição da tarefa em 80 caracteres", () => {
    const longDescription = "x".repeat(100);
    const task = { description: longDescription };
    expect(getSegmentNotification(plan, 0, settings, task).body).toBe(
      `Tarefa: ${"x".repeat(80)}. Pausa curta começou: 5 min.`,
    );
  });

  it("ignora tarefa inválida ou vazia sem produzir 'Tarefa: . '", () => {
    const emptyCases = [
      null,
      undefined,
      {},
      { description: "" },
      { description: "   " },
      { description: null },
      { description: 123 },
    ];
    for (const emptyTask of emptyCases) {
      const res = getSegmentNotification(plan, 0, settings, emptyTask);
      expect(res.body).toBe("Pausa curta começou: 5 min.");
      expect(res.body).not.toContain("Tarefa:");
    }
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
  it("usa os padrões quando não há nada salvo ou o payload é inválido", () => {
    expect(normalizeSettings()).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings("invalid")).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings([])).toEqual(DEFAULT_SETTINGS);
    expect(
      normalizeSettings({ durations: null, longBreakInterval: Infinity }),
    ).toEqual(DEFAULT_SETTINGS);
  });

  it("mantém valores válidos e corrige os inválidos", () => {
    expect(
      normalizeSettings({
        autoStartCycles: false,
        vibrate: "sim",
        distinctSounds: false,
        longBreakInterval: 99,
        dailyFocusGoal: 99,
        durations: { focus: 50, short: 0, long: "abc", extra: 3 },
      }),
    ).toEqual({
      autoStartCycles: false,
      vibrate: true,
      distinctSounds: false,
      hasSeenWelcome: false,
      longBreakInterval: 8,
      dailyFocusGoal: 12,
      durations: { focus: 50, short: 5, long: 15 },
    });
  });
});

describe("shouldVibrateInApp", () => {
  const justFinished = [{ typeId: "focus", endTime: NOW - 1000 }];
  const base = {
    finishedSegments: justFinished,
    now: NOW,
    settings,
    appActive: true,
    notificationsScheduled: false,
  };

  it("vibra quando o ciclo acabou agora, com o app aberto e sem notificação", () => {
    expect(shouldVibrateInApp(base)).toBe(true);
  });

  it("não vibra junto com a notificação, que já vibra sozinha", () => {
    expect(shouldVibrateInApp({ ...base, notificationsScheduled: true })).toBe(
      false,
    );
  });

  it("não vibra com o app em segundo plano ou com a opção desligada", () => {
    expect(shouldVibrateInApp({ ...base, appActive: false })).toBe(false);
    expect(
      shouldVibrateInApp({
        ...base,
        settings: { ...settings, vibrate: false },
      }),
    ).toBe(false);
  });

  it("não vibra por um ciclo que acabou há muito tempo", () => {
    const old = [{ typeId: "focus", endTime: NOW - 10 * MIN }];
    expect(shouldVibrateInApp({ ...base, finishedSegments: old })).toBe(false);
  });
});

describe("normalizeSavedSegments", () => {
  it("retorna null para entrada inválida e filtra segmentos sem endTime válido", () => {
    expect(normalizeSavedSegments(null)).toBeNull();
    expect(normalizeSavedSegments([])).toBeNull();
    expect(
      normalizeSavedSegments([
        null,
        { typeId: "focus", endTime: "bad" },
        { typeId: "unknown", startTime: 1000, endTime: 2000 },
      ]),
    ).toEqual([{ typeId: "focus", startTime: 1000, endTime: 2000 }]);
  });
});

describe("série de focos até a pausa longa", () => {
  const at = (day, hour, minute = 0) =>
    new Date(2026, 10, day, hour, minute).getTime();

  it("sem série salva, usa os focos de hoje", () => {
    expect(getSeriesCount(null, 3, at(25, 10))).toBe(3);
  });

  it("no mesmo dia, a série continua mesmo depois de horas parado", () => {
    const series = { count: 2, lastEndTime: at(25, 8) };
    expect(getSeriesCount(series, 2, at(25, 18))).toBe(2);
  });

  it("atravessa a meia-noite se o último foco terminou há pouco", () => {
    const series = { count: 2, lastEndTime: at(25, 23, 40) };
    expect(getSeriesCount(series, 0, at(26, 0, 5))).toBe(2);
    expect(addFocusToSeries(series, 0, at(26, 0, 30))).toEqual({
      count: 3,
      lastEndTime: at(26, 0, 30),
    });
  });

  it("recomeça no dia seguinte depois de uma pausa longa demais", () => {
    const series = { count: 3, lastEndTime: at(25, 22) };
    expect(getSeriesCount(series, 0, at(26, 9))).toBe(0);
    expect(addFocusToSeries(series, 0, at(26, 9))).toEqual({
      count: 1,
      lastEndTime: at(26, 9),
    });
  });

  it("descarta série salva inválida", () => {
    expect(normalizeSeries({ count: -1, lastEndTime: 1 })).toBeNull();
    expect(normalizeSeries({ count: 2 })).toBeNull();
    expect(normalizeSeries("x")).toBeNull();
    expect(normalizeSeries({ count: 2, lastEndTime: 5 })).toEqual({
      count: 2,
      lastEndTime: 5,
    });
  });
});
