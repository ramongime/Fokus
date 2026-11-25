import { getDocumentAsync } from "expo-document-picker";
import { MAX_BACKUP_LENGTH } from "./backupLogic";

// Na web o seletor devolve o File do navegador; lê o texto direto dele
export const pickBackupFile = async () => {
  const result = await getDocumentAsync({
    type: ["application/json", "text/plain", ".json", ".txt"],
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) {
    return null;
  }
  const asset = result.assets[0];
  if (asset.size != null && asset.size > MAX_BACKUP_LENGTH) {
    // userMessage: texto pronto para mostrar na tela
    throw Object.assign(new Error("Backup file too large"), {
      userMessage: "Arquivo grande demais para um backup do Fokus.",
    });
  }
  if (asset.file) {
    return asset.file.text();
  }
  const response = await fetch(asset.uri);
  return response.text();
};
