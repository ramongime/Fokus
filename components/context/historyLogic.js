/*
 * Histórico de focos por dia, em funções puras (testadas em historyLogic.test.js).
 *
 * O histórico é um objeto com uma entrada por dia em que houve foco:
 *   { "2026-09-26": { count: 3, minutes: 75 }, ... }
 * Os dias são no fuso do aparelho e só os últimos HISTORY_DAYS ficam guardados.
 */

export const HISTORY_DAYS = 90;

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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

const getDay = (history, key) => history[key] ?? { count: 0, minutes: 0 };

// Focos concluídos hoje
export const getTodayCount = (history, now) =>
  getDay(history, todayKey(now)).count;

// Soma focos concluídos ao histórico. Cada sessão: { endTime, minutes }.
// O dia é o do fim do foco, então um foco que termina 00:10 conta no dia novo.
export const addFocusSessions = (history, sessions, now) => {
  const next = { ...history };
  for (const { endTime, minutes } of sessions) {
    const key = todayKey(endTime);
    const day = getDay(next, key);
    next[key] = { count: day.count + 1, minutes: day.minutes + minutes };
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

// 45 -> "45 min", 125 -> "2h05", 120 -> "2h"
export const formatMinutes = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${pad(rest)}`;
};

// Converte o contador diário da versão anterior ({ date, count }) em histórico
export const historyFromLegacyStats = (stats, focusMinutes) =>
  stats?.date && stats.count > 0
    ? {
        [stats.date]: {
          count: stats.count,
          minutes: stats.count * focusMinutes,
        },
      }
    : {};
