import { getDocumentAsync } from "expo-document-picker";
import { File } from "expo-file-system";
import { MAX_BACKUP_LENGTH } from "./backupLogic";

// Abre o seletor de arquivos do sistema e devolve o texto do arquivo escolhido, ou null
// se a pessoa cancelou. Aceita qualquer tipo: um backup salvo pela folha de compartilhar
// pode ter virado .txt, e o conteúdo é validado depois por parseBackup.
export const pickBackupFile = async () => {
  const result = await getDocumentAsync({
    type: "*/*",
    copyToCacheDirectory: true,
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
  return new File(asset.uri).text();
};
