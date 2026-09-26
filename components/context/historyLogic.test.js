import {
  addFocusSessions,
  formatMinutes,
  getStreak,
  getTodayCount,
  getWeek,
  HISTORY_DAYS,
  historyFromLegacyStats,
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
  });
});
