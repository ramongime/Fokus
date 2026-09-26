import { useContext } from "react";
import { SettingsContext } from "./SettingsProvider";

export default function useSettingsContext() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("Tentando acessar o contexto fora do SettingsProvider");
  }
  return context;
}
