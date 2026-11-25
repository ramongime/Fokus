/*
 * Backup dos dados do Fokus em JSON, em funções puras (testadas em backupLogic.test.js).
 * O arquivo leva configurações, tarefas e histórico; o estado do timer em andamento
 * fica de fora, porque não faz sentido restaurá-lo em outro momento ou aparelho.
 */
import { normalizeHistory } from "./historyLogic";
import { normalizeStoredTasks } from "./taskLogic";
import { normalizeSettings } from "./timerLogic";

export const BACKUP_APP = "fokus";
export const BACKUP_VERSION = 1;
export const MAX_BACKUP_LENGTH = 2 * 1024 * 1024;

// Ex.: fokus-backup-2026-11-25.json (data local)
export const getBackupFileName = (now) => {
  const date = new Date(now);
  const pad = (value) => String(value).padStart(2, "0");
  return `fokus-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
};

export const buildBackup = ({ settings, tasks, history, now }) =>
  JSON.stringify(
    {
      app: BACKUP_APP,
      version: BACKUP_VERSION,
      exportedAt: new Date(now).toISOString(),
      settings,
      tasks,
      history,
    },
    null,
    2,
  );

// Lê o texto de um backup. Devolve { ok: true, data } com tudo já validado,
// ou { ok: false, error } com a mensagem para mostrar ao usuário.
export const parseBackup = (text) => {
  const content = String(text ?? "").trim();
  // Um ano de histórico com tarefas fica bem abaixo disso; texto maior não é um backup
  if (content.length > MAX_BACKUP_LENGTH) {
    return { ok: false, error: "Texto grande demais para um backup do Fokus." };
  }
  let raw;
  try {
    raw = JSON.parse(content);
  } catch {
    return {
      ok: false,
      error: "Não parece um backup do Fokus. Cole o texto inteiro do arquivo.",
    };
  }
  if (!raw || typeof raw !== "object" || raw.app !== BACKUP_APP) {
    return { ok: false, error: "Este texto não é um backup do Fokus." };
  }
  if (!Number.isInteger(raw.version) || raw.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: "Backup de uma versão mais nova do Fokus. Atualize o app.",
    };
  }
  const settings =
    raw.settings &&
    typeof raw.settings === "object" &&
    !Array.isArray(raw.settings)
      ? normalizeSettings(raw.settings)
      : null;
  const tasks = normalizeStoredTasks(Array.isArray(raw.tasks) ? raw.tasks : []);
  const history = normalizeHistory(raw.history);
  return { ok: true, data: { settings, tasks, history } };
};

// Resumo do que um backup vai restaurar, para a confirmação
export const describeBackup = ({ tasks, history }) => {
  const days = Object.keys(history).length;
  const focuses = Object.values(history).reduce(
    (total, day) => total + day.count,
    0,
  );
  return `${tasks.length} ${tasks.length === 1 ? "tarefa" : "tarefas"} e ${focuses} ${focuses === 1 ? "foco" : "focos"} em ${days} ${days === 1 ? "dia" : "dias"}`;
};
