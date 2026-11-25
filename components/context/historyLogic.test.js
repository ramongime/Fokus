import {
  getNextDayStart,
  addFocusSessions,
  formatMinutes,
  getStreak,
  getTodayCount,
  getMonth,
  getWeek,
  HISTORY_DAYS,
  MAX_DAY_MINUTES,
  mergeHistory,
  historyFromLegacyStats,
  normalizeHistory,
  summarizeMonth,
  summarizeTasks,
  summarizeWeek,
  todayKey,
} from "./historyLogic";

// Sábado, 26/09/2026, 14h
const NOW = new Date(2026, 8, 26, 14, 0, 0).getTime();
const at = (day, hour = 10, minute = 0) =>
  new Date(2026, 8, day, hour, minute).getTime();

describe("addFocusSessions", () => {
  it("soma focos e minutos no dia em que cada foco terminou", () => {
    const history = addFocusSessions(
      {},
      [
        { endTime: at(26, 9), minutes: 25 },
        { endTime: at(26, 10), minutes: 25 },
        { endTime: at(25, 23), minutes: 50 },
      ],
      NOW,
    );
    expect(history).toEqual({
      "2026-09-26": { count: 2, minutes: 50 },
      "2026-09-25": { count: 1, minutes: 50 },
    });
  });

  it("conta no dia novo um foco que termina depois da meia-noite", () => {
    const history = addFocusSessions(
      {},
      [{ endTime: at(27, 0, 10), minutes: 25 }],
      at(27, 0, 11),
    );
    expect(Object.keys(history)).toEqual(["2026-09-27"]);
  });

  it("descarta dias mais antigos que o limite do histórico", () => {
    const old = new Date(2026, 8, 26 - HISTORY_DAYS, 12).getTime();
    const history = addFocusSessions(
      { [todayKey(old)]: { count: 4, minutes: 100 } },
      [{ endTime: NOW, minutes: 25 }],
      NOW,
    );
    expect(Object.keys(history)).toEqual(["2026-09-26"]);
  });
});

describe("getWeek", () => {
  const history = {
    "2026-09-20": { count: 1, minutes: 25 },
    "2026-09-24": { count: 4, minutes: 100 },
    "2026-09-26": { count: 2, minutes: 50 },
  };

  it("devolve os últimos 7 dias em ordem, terminando hoje", () => {
    const week = getWeek(history, NOW);
    expect(week.map((d) => d.key)).toEqual([
      "2026-09-20",
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
    ]);
    expect(week.map((d) => d.weekday)).toEqual([
      "Dom",
      "Seg",
      "Ter",
      "Qua",
      "Qui",
      "Sex",
      "Sáb",
    ]);
    expect(week[6]).toMatchObject({
      isToday: true,
      dateLabel: "26/09",
      count: 2,
      minutes: 50,
    });
    expect(week[1]).toMatchObject({ isToday: false, count: 0, minutes: 0 });
  });

  it("resume a semana", () => {
    expect(summarizeWeek(getWeek(history, NOW))).toEqual({
      count: 7,
      minutes: 175,
    });
  });

  it("lê o total de hoje", () => {
    expect(getTodayCount(history, NOW)).toBe(2);
    expect(getTodayCount(history, at(27))).toBe(0);
  });
});

describe("getMonth", () => {
  const history = {
    "2026-09-20": { count: 1, minutes: 25 },
    "2026-09-24": { count: 4, minutes: 100 },
    "2026-09-26": { count: 2, minutes: 50 },
  };

  it("monta o calendário de segunda a domingo e identifica hoje e dias futuros", () => {
    const month = getMonth(history, NOW);
    expect(month).toMatchObject({
      key: "2026-09",
      title: "setembro 2026",
      weekdays: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
    });
    expect(month.days).toHaveLength(35);
    expect(month.days[0]).toMatchObject({ empty: true });
    expect(month.days.find((day) => day.key === "2026-09-26")).toMatchObject({
      dayNumber: 26,
      count: 2,
      minutes: 50,
      isToday: true,
      isFuture: false,
    });
    expect(month.days.find((day) => day.key === "2026-09-27")).toMatchObject({
      isFuture: true,
    });
  });

  it("resume focos e minutos do mês sem contar as células vazias", () => {
    expect(summarizeMonth(getMonth(history, NOW))).toEqual({
      count: 7,
      minutes: 175,
    });
  });
});

describe("getStreak", () => {
  it("conta os dias seguidos com foco até hoje", () => {
    const history = {
      "2026-09-23": { count: 1, minutes: 25 },
      "2026-09-24": { count: 2, minutes: 50 },
      "2026-09-25": { count: 1, minutes: 25 },
      "2026-09-26": { count: 1, minutes: 25 },
    };
    expect(getStreak(history, NOW)).toBe(4);
  });

  it("não quebra a sequência se hoje ainda não teve foco", () => {
    const history = {
      "2026-09-24": { count: 2, minutes: 50 },
      "2026-09-25": { count: 1, minutes: 25 },
    };
    expect(getStreak(history, NOW)).toBe(2);
  });

  it("zera depois de um dia sem foco", () => {
    expect(getStreak({ "2026-09-24": { count: 1, minutes: 25 } }, NOW)).toBe(0);
    expect(getStreak({}, NOW)).toBe(0);
  });
});

describe("formatMinutes", () => {
  it("mostra minutos, horas e horas com minutos", () => {
    expect(formatMinutes(0)).toBe("0 min");
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(120)).toBe("2h");
    expect(formatMinutes(125)).toBe("2h05");
  });
});

describe("historyFromLegacyStats", () => {
  it("converte o contador de hoje da versão anterior", () => {
    expect(
      historyFromLegacyStats({ date: "2026-09-26", count: 3 }, 25),
    ).toEqual({
      "2026-09-26": { count: 3, minutes: 75 },
    });
    expect(historyFromLegacyStats({ date: null, count: 0 }, 25)).toEqual({});
    expect(historyFromLegacyStats(undefined, 25)).toEqual({});
    expect(historyFromLegacyStats({ date: "__proto__", count: 2 }, 25)).toEqual(
      {},
    );
    expect(
      historyFromLegacyStats({ date: "2026-09-26", count: Infinity }, 25),
    ).toEqual({});
  });
});

describe("normalizeHistory", () => {
  it("mantém dias válidos e descarta entradas malformadas", () => {
    expect(normalizeHistory(null)).toEqual({});
    expect(normalizeHistory([])).toEqual({});
    expect(
      normalizeHistory({
        "2026-09-26": { count: 2, minutes: 50 },
        "2026-09-25": { count: 1 },
        invalid: { count: 3, minutes: 75 },
        "2026-09-24": { count: -1, minutes: 25 },
        "2026-09-23": null,
      }),
    ).toEqual({
      "2026-09-26": { count: 2, minutes: 50 },
      "2026-09-25": { count: 1, minutes: 0 },
    });
  });
});

describe("getNextDayStart", () => {
  it("retorna a próxima meia-noite local", () => {
    const now = new Date(2026, 10, 25, 23, 59, 30).getTime();
    expect(getNextDayStart(now)).toBe(new Date(2026, 10, 26).getTime());
  });

  it("vira o mês e o ano", () => {
    const now = new Date(2026, 11, 31, 8, 0).getTime();
    expect(getNextDayStart(now)).toBe(new Date(2027, 0, 1).getTime());
  });

  it("à meia-noite em ponto aponta para o dia seguinte", () => {
    const now = new Date(2026, 10, 26).getTime();
    expect(getNextDayStart(now)).toBe(new Date(2026, 10, 27).getTime());
  });
});

describe("focos por tarefa", () => {
  it("guarda no dia o total de cada tarefa", () => {
    const history = addFocusSessions(
      {},
      [
        { endTime: at(26, 9), minutes: 25, taskId: "7" },
        { endTime: at(26, 10), minutes: 25, taskId: "7" },
        { endTime: at(26, 11), minutes: 15 },
      ],
      NOW,
    );
    expect(history[todayKey(NOW)]).toEqual({
      count: 3,
      minutes: 65,
      tasks: { 7: { count: 2, minutes: 50 } },
    });
  });

  it("mantém e valida as tarefas ao normalizar", () => {
    expect(
      normalizeHistory({
        "2026-09-26": {
          count: 2,
          minutes: 50,
          tasks: { 7: { count: 1, minutes: 25 }, x: { count: -1 } },
        },
        "2026-09-25": { count: 1, minutes: 25, tasks: "lixo" },
      }),
    ).toEqual({
      "2026-09-26": {
        count: 2,
        minutes: 50,
        tasks: { 7: { count: 1, minutes: 25 } },
      },
      "2026-09-25": { count: 1, minutes: 25 },
    });
  });

  it("resume por tarefa, com sem tarefa e excluídas agrupadas", () => {
    const history = {
      "2026-09-26": {
        count: 4,
        minutes: 100,
        tasks: {
          1: { count: 1, minutes: 25 },
          2: { count: 1, minutes: 25 },
          3: { count: 1, minutes: 25 },
        },
      },
      "2026-09-25": {
        count: 2,
        minutes: 50,
        tasks: { 1: { count: 2, minutes: 50 } },
      },
    };
    const rows = summarizeTasks(
      history,
      ["2026-09-25", "2026-09-26"],
      [{ id: "1", description: "Ler" }],
    );
    expect(rows).toEqual([
      { id: "task:1", label: "Ler", count: 3, minutes: 75 },
      { id: "deleted", label: "Tarefa excluída", count: 2, minutes: 50 },
      { id: "none", label: "Sem tarefa", count: 1, minutes: 25 },
    ]);
  });
});

describe("mergeHistory", () => {
  it("fica com o registro de mais focos em cada dia, sem somar duas vezes", () => {
    const current = { "2026-09-26": { count: 3, minutes: 75 } };
    const incoming = {
      "2026-09-26": { count: 2, minutes: 50 },
      "2026-09-20": { count: 1, minutes: 25 },
    };
    expect(mergeHistory(current, incoming, NOW)).toEqual({
      "2026-09-26": { count: 3, minutes: 75 },
      "2026-09-20": { count: 1, minutes: 25 },
    });
  });

  it("descarta dias além do limite do histórico", () => {
    const old = todayKey(NOW - (HISTORY_DAYS + 5) * 24 * 60 * 60 * 1000);
    expect(mergeHistory({}, { [old]: { count: 1, minutes: 25 } }, NOW)).toEqual(
      {},
    );
  });
});

describe("limites do histórico", () => {
  it("limita contagens absurdas de dados corrompidos ou adulterados", () => {
    expect(
      normalizeHistory({
        "2026-09-26": {
          count: 1e12,
          minutes: 1e12,
          tasks: {
            1: { count: 2.7, minutes: 50 },
            ["x".repeat(65)]: { count: 1 },
          },
        },
      }),
    ).toEqual({
      "2026-09-26": {
        count: MAX_DAY_MINUTES,
        minutes: MAX_DAY_MINUTES,
        tasks: { 1: { count: 2, minutes: 50 } },
      },
    });
  });

  it("não deixa __proto__ mexer no protótipo", () => {
    const history = normalizeHistory(
      JSON.parse(
        '{"__proto__":{"count":1},"2026-09-26":{"count":1,"minutes":25,"tasks":{"__proto__":{"count":1}}}}',
      ),
    );
    expect(Object.keys(history)).toEqual(["2026-09-26"]);
    expect({}.count).toBeUndefined();
  });
});
