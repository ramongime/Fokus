import { Share } from "react-native";

// No celular, abre a folha de compartilhar com o texto do backup (salvar em Arquivos,
// mandar por e-mail, mensagem para si mesmo...). Devolve false se o usuário cancelou.
export const shareBackup = async ({ fileName, json }) => {
  const result = await Share.share({ title: fileName, message: json });
  return result?.action !== Share.dismissedAction;
};
