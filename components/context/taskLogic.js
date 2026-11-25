/*
 * Regras das tarefas em funções puras (sem React nem armazenamento).
 */

// Valida a lista salva (ou importada): ids viram string, duplicados e itens
// inválidos são descartados, a descrição tem no máximo 120 caracteres.
export const normalizeStoredTasks = (rawList) => {
  const seenIds = new Set();
  const normalized = [];

  for (const item of rawList) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      continue;
    }
    if (item.id == null) {
      continue;
    }
    const id = String(item.id).trim();
    if (!id || seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);

    const task = {
      id,
      description:
        typeof item.description === "string"
          ? item.description.slice(0, 120)
          : "",
    };
    if (item.completed !== undefined) {
      task.completed = Boolean(item.completed);
    }
    if (item.pomodoros !== undefined) {
      task.pomodoros =
        typeof item.pomodoros === "number" &&
        Number.isFinite(item.pomodoros) &&
        item.pomodoros >= 0
          ? Math.floor(item.pomodoros)
          : 0;
    }
    normalized.push(task);
  }
  return normalized;
};

// Junta tarefas importadas às atuais. Mesmo id: vale a importada, mas o total de
// focos nunca diminui. Ordem: as atuais, depois as novas.
export const mergeTasks = (current, incoming) => {
  const incomingById = new Map(incoming.map((task) => [task.id, task]));
  const merged = current.map((task) => {
    const other = incomingById.get(task.id);
    if (!other) {
      return task;
    }
    incomingById.delete(task.id);
    const pomodoros = Math.max(task.pomodoros ?? 0, other.pomodoros ?? 0);
    return pomodoros > 0 ? { ...other, pomodoros } : { ...other };
  });
  return [...merged, ...incomingById.values()];
};
