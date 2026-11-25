/*
 * Histórico de focos por dia, em funções puras (testadas em historyLogic.test.js).
 *
 * O histórico é um objeto com uma entrada por dia em que houve foco:
 *   { "2026-09-26": { count: 3, minutes: 75 }, ... }
 * Os dias são no fuso do aparelho e só os últimos HISTORY_DAYS ficam guardados.
 * Quando o foco tinha uma tarefa, o dia também guarda o total por tarefa:
 *   { count: 3, minutes: 75, tasks: { "1700000000000": { count: 2, minutes: 50 } } }
 */

// Um ano: uma entrada pequena por dia com foco, então cabe folgado no AsyncStorage
export const HISTORY_DAYS = 365;

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const MONTH_WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const pad = (value) => String(value).padStart(2, "0");

// Data local no formato "2026-09-26"
export const todayKey = (now) => {
  const date = new Date(now);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

// Mesmo horário, `days` dias antes (usa o calendário, então funciona na troca de horário de verão)
const daysBefore = (now, days) => {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return date.getTime();
};

const getDay = (history, key) =>
  history && Object.prototype.hasOwnProperty.call(history, key)
    ? history[key]
    : { count: 0, minutes: 0 };

// Focos concluídos hoje
export const getTodayCount = (history, now) =>
  getDay(history, todayKey(now)).count;

// Início do próximo dia local (meia-noite), quando o contador de focos de hoje zera
export const getNextDayStart = (now) => {
  const date = new Date(now);
  date.setHours(24, 0, 0, 0);
  return date.getTime();
};

// Soma focos concluídos ao histórico. Cada sessão: { endTime, minutes, taskId? }.
// O dia é o do fim do foco, então um foco que termina 00:10 conta no dia novo.
export const addFocusSessions = (history, sessions, now) => {
  const next = { ...history };
  for (const { endTime, minutes, taskId } of sessions) {
    if (!Number.isFinite(endTime)) {
      continue;
    }
    const key = todayKey(endTime);
    const day = getDay(next, key);
    const safeMinutes =
      typeof minutes === "number" && Number.isFinite(minutes) && minutes >= 0
        ? minutes
        : 0;
    const nextDay = {
      ...day,
      count: day.count + 1,
      minutes: day.minutes + safeMinutes,
    };
    if (taskId != null && String(taskId).trim() !== "") {
      const id = String(taskId);
      const task = day.tasks?.[id] ?? { count: 0, minutes: 0 };
      nextDay.tasks = {
        ...day.tasks,
        [id]: { count: task.count + 1, minutes: task.minutes + safeMinutes },
      };
    }
    next[key] = nextDay;
  }
  const oldestKey = todayKey(daysBefore(now, HISTORY_DAYS - 1));
  return Object.fromEntries(
    Object.entries(next).filter(([key]) => key >= oldestKey),
  );
};

// Últimos 7 dias, do mais antigo para hoje, prontos para o gráfico
export const getWeek = (history, now) =>
  Array.from({ length: 7 }, (_, index) => {
    const time = daysBefore(now, 6 - index);
    const date = new Date(time);
    const key = todayKey(time);
    return {
      key,
      weekday: WEEKDAYS[date.getDay()],
      dateLabel: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`,
      isToday: index === 6,
      ...getDay(history, key),
    };
  });

// Dias seguidos com pelo menos um foco. Se hoje ainda não teve foco, conta a partir de
// ontem, para a sequência não "quebrar" logo de manhã.
export const getStreak = (history, now) => {
  let offset = getTodayCount(history, now) > 0 ? 0 : 1;
  let streak = 0;
  while (getDay(history, todayKey(daysBefore(now, offset))).count > 0) {
    streak += 1;
    offset += 1;
  }
  return streak;
};

export const summarizeWeek = (week) => ({
  count: week.reduce((total, day) => total + day.count, 0),
  minutes: week.reduce((total, day) => total + day.minutes, 0),
});

// Dias do mês em uma grade de calendário iniciada na segunda-feira.
export const getMonth = (history, now, offset = 0) => {
  const date = new Date(now);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  date.setMonth(date.getMonth() + offset);

  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingDays = (new Date(year, month, 1).getDay() + 6) % 7;
  const cellCount = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
  const today = todayKey(now);
  const days = Array.from({ length: cellCount }, (_, index) => {
    const dayNumber = index - leadingDays + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      return { key: `empty-${index}`, empty: true };
    }

    const key = `${year}-${pad(month + 1)}-${pad(dayNumber)}`;
    const stats = getDay(history, key);
    return {
      key,
      dayNumber,
      count: stats.count,
      minutes: stats.minutes,
      isToday: key === today,
      isFuture: key > today,
      dateLabel: `${pad(dayNumber)}/${pad(month + 1)}`,
    };
  });

  return {
    key: `${year}-${pad(month + 1)}`,
    title: `${MONTHS[month]} ${year}`,
    year,
    month,
    weekdays: MONTH_WEEKDAYS,
    days,
  };
};

export const summarizeMonth = (month) => {
  const validDays = month.days.filter((day) => !day.empty);
  return {
    count: validDays.reduce((total, day) => total + day.count, 0),
    minutes: validDays.reduce((total, day) => total + day.minutes, 0),
  };
};

export const getOldestHistoryMonthKey = (now) =>
  todayKey(daysBefore(now, HISTORY_DAYS - 1)).slice(0, 7);

// 45 -> "45 min", 125 -> "2h05", 120 -> "2h"
export const formatMinutes = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${pad(rest)}`;
};

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Converte o contador diário da versão anterior ({ date, count }) em histórico
export const historyFromLegacyStats = (stats, focusMinutes) => {
  if (
    !stats ||
    typeof stats !== "object" ||
    typeof stats.date !== "string" ||
    !DAY_KEY_PATTERN.test(stats.date) ||
    typeof stats.count !== "number" ||
    !Number.isFinite(stats.count) ||
    stats.count <= 0
  ) {
    return {};
  }
  const safeFocusMinutes =
    typeof focusMinutes === "number" &&
    Number.isFinite(focusMinutes) &&
    focusMinutes >= 0
      ? focusMinutes
      : 0;
  return {
    [stats.date]: {
      count: stats.count,
      minutes: stats.count * safeFocusMinutes,
    },
  };
};

// Filtra entradas corrompidas ao carregar o histórico salvo no dispositivo
export const normalizeHistory = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(raw)
      .filter(
        ([key, entry]) =>
          DAY_KEY_PATTERN.test(key) &&
          entry &&
          typeof entry === "object" &&
          typeof entry.count === "number" &&
          Number.isFinite(entry.count) &&
          entry.count >= 0,
      )
      .map(([key, entry]) => {
        const day = { count: entry.count, minutes: safeMinutesOf(entry) };
        const tasks = normalizeDayTasks(entry.tasks);
        if (tasks) {
          day.tasks = tasks;
        }
        return [key, day];
      }),
  );
};

const isCount = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const safeMinutesOf = (entry) => (isCount(entry?.minutes) ? entry.minutes : 0);

const normalizeDayTasks = (raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const entries = Object.entries(raw)
    .filter(
      ([id, entry]) =>
        id.trim() !== "" &&
        entry &&
        typeof entry === "object" &&
        isCount(entry.count),
    )
    .map(([id, entry]) => [
      id,
      { count: entry.count, minutes: safeMinutesOf(entry) },
    ]);
  return entries.length > 0 ? Object.fromEntries(entries) : null;
};

// Junta um histórico importado ao atual: em cada dia vale o registro com mais focos
// (o mesmo dia não é somado duas vezes ao restaurar um backup do próprio aparelho).
// Dias além de HISTORY_DAYS são descartados.
export const mergeHistory = (current, incoming, now) => {
  const next = { ...current };
  for (const [key, day] of Object.entries(incoming)) {
    const existing = next[key];
    if (!existing || day.count > existing.count) {
      next[key] = day;
    }
  }
  const oldestKey = todayKey(daysBefore(now, HISTORY_DAYS - 1));
  return Object.fromEntries(
    Object.entries(next).filter(([key]) => key >= oldestKey),
  );
};

// Focos e minutos por tarefa nos dias `dayKeys`, do maior tempo para o menor.
// Focos sem tarefa (ou de antes de existir esse registro) aparecem como "Sem tarefa";
// tarefas que não existem mais aparecem como "Tarefa excluída".
export const summarizeTasks = (history, dayKeys, tasks) => {
  const totals = new Map();
  const add = (id, count, minutes) => {
    const current = totals.get(id) ?? { count: 0, minutes: 0 };
    totals.set(id, {
      count: current.count + count,
      minutes: current.minutes + minutes,
    });
  };
  for (const key of dayKeys) {
    const day = getDay(history, key);
    let taskCount = 0;
    let taskMinutes = 0;
    for (const [id, entry] of Object.entries(day.tasks ?? {})) {
      add(id, entry.count, entry.minutes);
      taskCount += entry.count;
      taskMinutes += entry.minutes;
    }
    const restCount = day.count - taskCount;
    if (restCount > 0) {
      add(null, restCount, Math.max(0, day.minutes - taskMinutes));
    }
  }
  const names = new Map(
    (tasks ?? []).map((t) => [String(t.id), t.description]),
  );
  // Tarefas excluídas viram uma linha só
  const rows = new Map();
  for (const [id, total] of totals) {
    const rowId = id == null ? "none" : names.has(id) ? id : "deleted";
    const label =
      rowId === "none"
        ? "Sem tarefa"
        : rowId === "deleted"
          ? "Tarefa excluída"
          : names.get(id);
    const row = rows.get(rowId) ?? { id: rowId, label, count: 0, minutes: 0 };
    row.count += total.count;
    row.minutes += total.minutes;
    rows.set(rowId, row);
  }
  return [...rows.values()].sort(
    (x, y) => y.minutes - x.minutes || y.count - x.count,
  );
};
