import { useContext } from "react";
import { TimerContext } from "./TimerProvider";

// Estado do timer sem o tempo restante: não renderiza a cada segundo enquanto o
// timer roda. Use em telas e no menu, que só precisam de focos do dia, histórico etc.
export default function useTimerSummaryContext() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("Tentando acessar o contexto fora do TimerProvider");
  }
  return context;
}
