import { getDocumentAsync } from "expo-document-picker";
import { File } from "expo-file-system";
import { MAX_BACKUP_LENGTH } from "./backupLogic";
import { pickBackupFile } from "./pickBackupFile";

jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-file-system", () => ({
  File: jest.fn().mockImplementation(() => ({
    text: jest.fn(() => Promise.resolve('{"app":"fokus"}')),
  })),
}));

describe("pickBackupFile (nativo)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lê o texto do arquivo escolhido", async () => {
    getDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///cache/backup.json", size: 20 }],
    });

    await expect(pickBackupFile()).resolves.toBe('{"app":"fokus"}');
    expect(getDocumentAsync).toHaveBeenCalledWith(
      expect.objectContaining({ copyToCacheDirectory: true, multiple: false }),
    );
    expect(File).toHaveBeenCalledWith("file:///cache/backup.json");
  });

  it("devolve null quando a pessoa cancela", async () => {
    getDocumentAsync.mockResolvedValueOnce({ canceled: true, assets: null });
    await expect(pickBackupFile()).resolves.toBeNull();
    expect(File).not.toHaveBeenCalled();
  });

  it("recusa arquivo grande demais sem ler", async () => {
    getDocumentAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: "file:///x.json", size: MAX_BACKUP_LENGTH + 1 }],
    });
    await expect(pickBackupFile()).rejects.toMatchObject({
      userMessage: "Arquivo grande demais para um backup do Fokus.",
    });
    expect(File).not.toHaveBeenCalled();
  });
});
