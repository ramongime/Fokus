import { useContext, useMemo } from "react";
import { TimerContext, TimerSecondsContext } from "./TimerProvider";

// Estado completo do timer, incluindo o tempo restante (renderiza a cada segundo).
// Telas que não mostram o relógio devem usar useTimerSummaryContext.
export default function useTimerContext() {
  const context = useContext(TimerContext);
  const seconds = useContext(TimerSecondsContext);
  const merged = useMemo(
    () => (context ? { ...context, seconds } : null),
    [context, seconds],
  );
  if (!merged) {
    throw new Error("Tentando acessar o contexto fora do TimerProvider");
  }
  return merged;
}
