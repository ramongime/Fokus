import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useEffect, useState } from "react";

export const ResourceContext = createContext(null);

// Formato: "<app>-<recurso>"
const STORAGE_KEY = "app-resources";

export function ResourceProvider({ children }) {
  const [resources, setResources] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        setResources(json != null ? JSON.parse(json) : []);
      } catch (e) {
        console.warn("Erro ao carregar dados", e);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(resources)).catch((e) =>
      console.warn("Erro ao salvar dados", e)
    );
  }, [resources, isLoaded]);

  const addResource = (description) => {
    setResources((old) => [
      ...old,
      { id: Date.now().toString(), description, completed: false },
    ]);
  };

  const toggleResourceCompleted = (id) => {
    setResources((old) =>
      old.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  };

  const updateResource = (id, description) => {
    setResources((old) =>
      old.map((r) => (r.id === id ? { ...r, description } : r))
    );
  };

  const deleteResource = (id) => {
    setResources((old) => old.filter((r) => r.id !== id));
  };

  return (
    <ResourceContext.Provider
      value={{
        resources,
        isLoaded,
        addResource,
        toggleResourceCompleted,
        updateResource,
        deleteResource,
      }}
    >
      {children}
    </ResourceContext.Provider>
  );
}
