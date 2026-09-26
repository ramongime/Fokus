export const pomodoro = [
  {
    id: "focus",
    initialValue: 25 * 60,
    image: require("../assets/images/pomodoro.png"),
    display: "Foco",
    notification: {
      title: "Foco concluído! 🍅",
      body: "Bom trabalho. Hora de fazer uma pausa.",
    },
  },
  {
    id: "short",
    initialValue: 5 * 60,
    image: require("../assets/images/short.png"),
    display: "Pausa curta",
    notification: {
      title: "Pausa curta encerrada",
      body: "Bora voltar para o foco!",
    },
  },
  {
    id: "long",
    initialValue: 15 * 60,
    image: require("../assets/images/long.png"),
    display: "Pausa longa",
    notification: {
      title: "Pausa longa encerrada",
      body: "Descansou? Bora voltar para o foco!",
    },
  },
];
