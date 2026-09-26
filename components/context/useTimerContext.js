import { useContext } from "react";
import { TimerContext } from "./TimerProvider";

export default function useTimerContext() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("Tentando acessar o contexto fora do TimerProvider");
  }
  return context;
}
