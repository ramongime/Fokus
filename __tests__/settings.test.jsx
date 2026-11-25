import { fireEvent, render, waitFor } from "@testing-library/react-native";
import Settings from "../app/settings";
import { buildBackup } from "../components/context/backupLogic";
import { pickBackupFile } from "../components/context/pickBackupFile";
import { shareBackup } from "../components/context/shareBackup";
import useSettingsContext from "../components/context/useSettingsContext";
import useTaskContext from "../components/context/useTaskContext";
import useTimerSummaryContext from "../components/context/useTimerSummaryContext";
import { DEFAULT_SETTINGS } from "../constants/settings";

jest.mock("../components/context/shareBackup", () => ({
  shareBackup: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("../components/context/pickBackupFile", () => ({
  pickBackupFile: jest.fn(),
}));
jest.mock("../components/context/useSettingsContext", () => jest.fn());
jest.mock("../components/context/useTaskContext", () => jest.fn());
jest.mock("../components/context/useTimerSummaryContext", () => jest.fn());

const history = { "2026-11-25": { count: 2, minutes: 50 } };
const tasks = [{ id: "1", description: "Ler" }];

const setup = async () => {
  const handlers = {
    replaceSettings: jest.fn(),
    importTasks: jest.fn(),
    importHistory: jest.fn(),
  };
  useSettingsContext.mockReturnValue({
    settings: DEFAULT_SETTINGS,
    replaceSettings: handlers.replaceSettings,
  });
  useTaskContext.mockReturnValue({ tasks, importTasks: handlers.importTasks });
  useTimerSummaryContext.mockReturnValue({
    history,
    importHistory: handlers.importHistory,
  });
  const utils = await render(<Settings />);
  return { ...utils, ...handlers };
};

describe("Settings screen · Seus dados", () => {
  beforeEach(() => jest.clearAllMocks());

  it("exporta um backup com tarefas, histórico e configurações", async () => {
    const { getByText } = await setup();

    await fireEvent.press(getByText("Exportar backup"));

    await waitFor(() => expect(shareBackup).toHaveBeenCalledTimes(1));
    const { fileName, json } = shareBackup.mock.calls[0][0];
    expect(fileName).toMatch(/^fokus-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const parsed = JSON.parse(json);
    expect(parsed.app).toBe("fokus");
    expect(parsed.tasks).toEqual(tasks);
    expect(parsed.history).toEqual(history);
    expect(getByText("Backup exportado.")).toBeTruthy();
  });

  it("restaura um backup colado depois de confirmar", async () => {
    const {
      getByText,
      getByLabelText,
      replaceSettings,
      importTasks,
      importHistory,
    } = await setup();
    const backup = buildBackup({
      settings: { ...DEFAULT_SETTINGS, dailyFocusGoal: 6 },
      tasks: [{ id: "9", description: "Antiga" }],
      history,
      now: Date.now(),
    });

    await fireEvent.press(getByText("Restaurar backup"));
    await fireEvent.changeText(getByLabelText("Texto do backup"), backup);
    await fireEvent.press(getByText("Continuar"));
    expect(getByText(/Encontrado: 1 tarefa e 2 focos em 1 dia/)).toBeTruthy();
    await fireEvent.press(getByText("Restaurar"));

    expect(replaceSettings).toHaveBeenCalledWith(
      expect.objectContaining({ dailyFocusGoal: 6 }),
    );
    expect(importTasks).toHaveBeenCalledWith([
      { id: "9", description: "Antiga" },
    ]);
    expect(importHistory).toHaveBeenCalledWith(history);
  });

  it("mostra o erro e não restaura texto inválido", async () => {
    const { getByText, getByLabelText, importTasks } = await setup();

    await fireEvent.press(getByText("Restaurar backup"));
    await fireEvent.changeText(getByLabelText("Texto do backup"), "oi");
    await fireEvent.press(getByText("Continuar"));

    expect(getByText(/Não parece um backup do Fokus/)).toBeTruthy();
    expect(importTasks).not.toHaveBeenCalled();
  });

  it("restaura escolhendo o arquivo do backup", async () => {
    pickBackupFile.mockResolvedValueOnce(
      buildBackup({ settings: DEFAULT_SETTINGS, tasks, history, now: 0 }),
    );
    const { getByText, importHistory } = await setup();

    await fireEvent.press(getByText("Restaurar backup"));
    await fireEvent.press(getByText("Escolher arquivo"));
    await waitFor(() =>
      expect(getByText(/Encontrado: 1 tarefa e 2 focos em 1 dia/)).toBeTruthy(),
    );
    await fireEvent.press(getByText("Restaurar"));

    expect(importHistory).toHaveBeenCalledWith(history);
  });

  it("não faz nada se a escolha do arquivo for cancelada", async () => {
    pickBackupFile.mockResolvedValueOnce(null);
    const { getByText, queryByText, importTasks } = await setup();

    await fireEvent.press(getByText("Restaurar backup"));
    await fireEvent.press(getByText("Escolher arquivo"));

    await waitFor(() => expect(getByText("Escolher arquivo")).toBeTruthy());
    expect(queryByText(/Encontrado/)).toBeNull();
    expect(importTasks).not.toHaveBeenCalled();
  });

  it("mostra erro amigável quando o arquivo não pode ser lido", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    pickBackupFile.mockRejectedValueOnce(new Error("EACCES"));
    const { getByText } = await setup();

    await fireEvent.press(getByText("Restaurar backup"));
    await fireEvent.press(getByText("Escolher arquivo"));

    await waitFor(() =>
      expect(getByText("Não foi possível ler o arquivo.")).toBeTruthy(),
    );
    warn.mockRestore();
  });
});
