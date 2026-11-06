import { Feather } from "@expo/vector-icons";
import { DrawerContentScrollView } from "expo-router/drawer";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSizes, radii } from "../../constants/theme";

const ROUTE_CONFIG = {
  pomodoro: {
    label: "Timer",
    icon: "clock",
  },
  "tasks/index": {
    label: "Tarefas",
    icon: "check-square",
  },
  history: {
    label: "Histórico",
    icon: "bar-chart-2",
  },
  settings: {
    label: "Configurações",
    icon: "sliders",
  },
};

export const CustomDrawerContent = ({
  state,
  navigation,
  descriptors,
  todayCount = 0,
  dailyGoal = 4,
  timerRunning = false,
  ...rest
}) => {
  const currentRouteName = state?.routes?.[state.index]?.name;
  const progressPercent = Math.min(
    100,
    Math.round((todayCount / Math.max(1, dailyGoal)) * 100),
  );

  return (
    <DrawerContentScrollView
      {...rest}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
    >
      <View style={styles.topSection}>
        {/* Bloco 1: Cabeçalho com Logo e Status */}
        <View style={styles.header}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Fokus"
          />
          <View style={styles.statusPill}>
            <View
              style={[
                styles.statusDot,
                timerRunning ? styles.statusDotActive : styles.statusDotIdle,
              ]}
            />
            <Text style={styles.statusText}>
              {timerRunning ? "Ciclo em andamento" : "Pronto para focar"}
            </Text>
          </View>
        </View>

        {/* Bloco 2: Itens de Navegação */}
        <View style={styles.navGroup}>
          <Text style={styles.sectionTitle}>Navegação</Text>
          {state?.routes?.map((route) => {
            const descriptor = descriptors?.[route.key];
            const options = descriptor?.options;

            // Oculta telas marcadas com display: none (ex: index, add-task, edit-task)
            if (options?.drawerItemStyle?.display === "none") {
              return null;
            }

            const config = ROUTE_CONFIG[route.name];
            const label =
              options?.drawerLabel ??
              config?.label ??
              options?.title ??
              route.name;
            const iconName = config?.icon ?? "circle";
            const isFocused = currentRouteName === route.name;

            return (
              <Pressable
                key={route.key}
                onPress={() => {
                  navigation?.navigate(route.name);
                }}
                style={[styles.item, isFocused && styles.itemFocused]}
                accessibilityRole="button"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={
                  typeof label === "string" ? label : route.name
                }
              >
                <View
                  style={[
                    styles.iconContainer,
                    isFocused && styles.iconContainerFocused,
                  ]}
                >
                  <Feather
                    name={iconName}
                    size={18}
                    color={isFocused ? colors.primary : colors.muted}
                  />
                </View>
                <Text
                  style={[
                    styles.itemLabel,
                    isFocused && styles.itemLabelFocused,
                  ]}
                >
                  {label}
                </Text>
                {isFocused ? (
                  <View style={styles.activePill} />
                ) : (
                  <Feather
                    name="chevron-right"
                    size={14}
                    color={colors.muted}
                    style={styles.chevron}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Bloco 3: Rodapé com Meta do Dia e Versão */}
      <View style={styles.footerSection}>
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalTitle}>Meta diária</Text>
            <Text style={styles.goalValue}>
              {todayCount}/{dailyGoal} focos
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
          </View>
        </View>

        <Text style={styles.versionText}>Fokus • Offline-first</Text>
      </View>
    </DrawerContentScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  topSection: {
    gap: 28,
  },
  header: {
    alignItems: "flex-start",
    gap: 12,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceTranslucent,
  },
  logo: {
    width: 120,
    height: 30,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceTranslucent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusDotActive: {
    backgroundColor: colors.success,
  },
  statusDotIdle: {
    backgroundColor: colors.muted,
  },
  statusText: {
    color: colors.muted,
    fontSize: fontSizes.sm,
    fontWeight: "500",
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 6,
  },
  navGroup: {
    gap: 6,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.sm,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
  },
  itemFocused: {
    backgroundColor: colors.surfaceTranslucent,
    borderColor: colors.surface,
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconContainerFocused: {
    // Espaço para personalização se desejado
  },
  itemLabel: {
    flex: 1,
    color: colors.muted,
    fontSize: fontSizes.md,
    fontWeight: "500",
  },
  itemLabelFocused: {
    color: colors.text,
    fontWeight: "600",
  },
  activePill: {
    width: 6,
    height: 18,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  chevron: {
    opacity: 0.4,
  },
  footerSection: {
    paddingTop: 24,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceTranslucent,
  },
  goalCard: {
    backgroundColor: colors.surfaceTranslucent,
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: radii.sm,
    padding: 14,
    gap: 10,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  goalTitle: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: "600",
  },
  goalValue: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: "700",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  versionText: {
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
    opacity: 0.6,
  },
});
