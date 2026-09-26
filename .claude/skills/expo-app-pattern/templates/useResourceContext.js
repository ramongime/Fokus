import { useContext } from "react";
import { ResourceContext } from "./ResourceProvider";

export default function useResourceContext() {
  const context = useContext(ResourceContext);
  if (!context) {
    throw new Error("Tentando acessar o contexto fora do ResourceProvider");
  }
  return context;
}
