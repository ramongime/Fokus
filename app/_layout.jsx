import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BackButtonDrawer } from "../components/BackButtonDrawer";
import { CustomDrawerContent } from "../components/CustomDrawerContent";
import { MenuToggleButton } from "../components/MenuToggleButton";
import { SettingsProvider } from "../components/context/SettingsProvider";
import { TasksProvider } from "../components/context/TaskProvider";
import { TimerProvider } from "../components/context/TimerProvider";
import useSettingsContext from "../components/context/useSettingsContext";
import useTimerContext from "../components/context/useTimerContext";
import { colors } from "../constants/theme";
import WidgetSync from "../widgets/WidgetSync";

function DrawerNavigator() {
  const { todayCount, timerRunning } = useTimerContext();
  const { settings } = useSettingsContext();

  return (
    <Drawer
      drawerContent={(props) => (
        <CustomDrawerContent
          {...props}
          todayCount={todayCount}
          dailyGoal={settings?.dailyFocusGoal}
          timerRunning={timerRunning}
        />
      )}
      screenOptions={{
        headerLeft: () => <MenuToggleButton />,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        // Sem isso, o fundo claro padrão do navegador aparece na troca de telas
        sceneStyle: {
          backgroundColor: colors.background,
        },
        drawerStyle: {
          backgroundColor: colors.background,
          width: 290,
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
          headerLeft: () => <BackButtonDrawer backHref="/tasks" />,
        }}
      />
      <Drawer.Screen
        name="edit-task/[id]"
        options={{
          drawerItemStyle: { display: "none" },
          title: "",
          headerLeft: () => <BackButtonDrawer backHref="/tasks" />,
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
          drawerLabel: "Tarefas",
          title: "",
        }}
      />
      <Drawer.Screen
        name="history"
        options={{
          drawerLabel: "Histórico",
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
  );
}

export default function Layout() {
  return (
    <SettingsProvider>
      <TasksProvider>
        <TimerProvider>
          <WidgetSync />
          <GestureHandlerRootView style={{ flex: 1 }}>
            <DrawerNavigator />
          </GestureHandlerRootView>
        </TimerProvider>
      </TasksProvider>
    </SettingsProvider>
  );
}
