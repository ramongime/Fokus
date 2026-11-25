import {
  buildBackup,
  describeBackup,
  getBackupFileName,
  MAX_BACKUP_LENGTH,
  parseBackup,
} from "./backupLogic";
import { DEFAULT_SETTINGS } from "../../constants/settings";

const NOW = new Date(2026, 10, 25, 14, 0).getTime();

describe("backup", () => {
  const data = {
    settings: { ...DEFAULT_SETTINGS, dailyFocusGoal: 6 },
    tasks: [{ id: "1", description: "Ler", pomodoros: 2 }],
    history: {
      "2026-11-25": {
        count: 2,
        minutes: 50,
        tasks: { 1: { count: 2, minutes: 50 } },
      },
    },
  };

  it("nomeia o arquivo com a data local", () => {
    expect(getBackupFileName(NOW)).toBe("fokus-backup-2026-11-25.json");
  });

  it("exporta e lê de volta os mesmos dados", () => {
    const result = parseBackup(buildBackup({ ...data, now: NOW }));
    expect(result.ok).toBe(true);
    expect(result.data.settings.dailyFocusGoal).toBe(6);
    expect(result.data.tasks).toEqual(data.tasks);
    expect(result.data.history).toEqual(data.history);
    expect(describeBackup(result.data)).toBe("1 tarefa e 2 focos em 1 dia");
  });

  it("recusa texto que não é JSON ou não é do Fokus", () => {
    expect(parseBackup("oi").ok).toBe(false);
    expect(parseBackup('{"app":"outro","version":1}').error).toBe(
      "Este texto não é um backup do Fokus.",
    );
  });

  it("recusa texto grande demais antes de ler", () => {
    const huge = `{"app":"fokus","version":1,"x":"${"a".repeat(MAX_BACKUP_LENGTH)}"}`;
    expect(parseBackup(huge).ok).toBe(false);
  });

  it("recusa backup de versão mais nova", () => {
    expect(parseBackup('{"app":"fokus","version":99}').ok).toBe(false);
  });

  it("descarta itens inválidos e mantém o resto", () => {
    const result = parseBackup(
      JSON.stringify({
        app: "fokus",
        version: 1,
        settings: "lixo",
        tasks: [{ id: 5, description: "Numérica" }, null, { foo: 1 }],
        history: { "2026-11-25": { count: 1, minutes: 25 }, xx: {} },
      }),
    );
    expect(result).toEqual({
      ok: true,
      data: {
        settings: null,
        tasks: [{ id: "5", description: "Numérica" }],
        history: { "2026-11-25": { count: 1, minutes: 25 } },
      },
    });
  });
});
