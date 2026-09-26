import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BackButtonDrawer } from "../components/BackButtonDrawer";
import { SettingsProvider } from "../components/context/SettingsProvider";
import { TasksProvider } from "../components/context/TaskProvider";
import { TimerProvider } from "../components/context/TimerProvider";
import { colors } from "../constants/theme";

export default function Layout() {
  return (
    <SettingsProvider>
      <TasksProvider>
        <TimerProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Drawer
              screenOptions={{
                headerStyle: {
                  backgroundColor: colors.background,
                },
                headerTintColor: colors.text,
                drawerStyle: {
                  backgroundColor: colors.background,
                },
                drawerLabelStyle: {
                  color: colors.text,
                },
              }}
            >
              <Drawer.Screen
                name="index"
                options={{
                  headerShown: false,
                  drawerItemStyle: { display: "none" },
                }}
              />
              <Drawer.Screen
                name="add-task/index"
                options={{
                  drawerItemStyle: { display: "none" },
                  title: "",
                  headerLeft: () => {
                    return <BackButtonDrawer backHref="/tasks" />;
                  },
                }}
              />
              <Drawer.Screen
                name="edit-task/[id]"
                options={{
                  drawerItemStyle: { display: "none" },
                  title: "",
                  headerLeft: () => {
                    return <BackButtonDrawer backHref="/tasks" />;
                  },
                }}
              />
              <Drawer.Screen
                name="pomodoro"
                options={{
                  drawerLabel: "Timer",
                  title: "",
                }}
              />
              <Drawer.Screen
                name="tasks/index"
                options={{
                  drawerLabel: "Lista de tarefas",
                  title: "",
                }}
              />
              <Drawer.Screen
                name="settings"
                options={{
                  drawerLabel: "Configurações",
                  title: "",
                }}
              />
            </Drawer>
          </GestureHandlerRootView>
        </TimerProvider>
      </TasksProvider>
    </SettingsProvider>
  );
}
