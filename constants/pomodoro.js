export const pomodoro = [
  {
    id: "focus",
    image: require("../assets/images/pomodoro.png"),
    display: "Foco",
    notification: {
      title: "Foco concluído! 🍅",
      body: "Bom trabalho. Hora de fazer uma pausa.",
    },
  },
  {
    id: "short",
    image: require("../assets/images/short.png"),
    display: "Pausa curta",
    notification: {
      title: "Pausa curta encerrada",
      body: "Bora voltar para o foco!",
    },
  },
  {
    id: "long",
    image: require("../assets/images/long.png"),
    display: "Pausa longa",
    notification: {
      title: "Pausa longa encerrada",
      body: "Descansou? Bora voltar para o foco!",
    },
  },
];
