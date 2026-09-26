import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import useSettingsContext from "../components/context/useSettingsContext";
import { SettingRow } from "../components/SettingRow";
import { Stepper } from "../components/Stepper";
import { pomodoro } from "../constants/pomodoro";
import { SETTINGS_LIMITS } from "../constants/settings";
import { colors, fontSizes, radii } from "../constants/theme";

export default function Settings() {
  const { settings, setAutoStartCycles, setDuration, setLongBreakInterval } =
    useSettingsContext();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>Configurações</Text>

      <View style={styles.card}>
        <Text style={styles.section}>Ciclos</Text>
        <SettingRow
          label="Emendar ciclos"
          description="Ao terminar um foco, a pausa começa sozinha, e depois o próximo foco."
        >
          <Switch
            value={settings.autoStartCycles}
            onValueChange={setAutoStartCycles}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
        <SettingRow
          label="Pausa longa a cada"
          description="Quantos focos até a pausa longa."
        >
          <Stepper
            value={settings.longBreakInterval}
            onChange={setLongBreakInterval}
            min={SETTINGS_LIMITS.longBreakInterval.min}
            max={SETTINGS_LIMITS.longBreakInterval.max}
            suffix=" focos"
          />
        </SettingRow>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Durações</Text>
        {pomodoro.map((p) => (
          <SettingRow key={p.id} label={p.display}>
            <Stepper
              value={settings.durations[p.id]}
              onChange={(minutes) => setDuration(p.id, minutes)}
              min={SETTINGS_LIMITS.durations[p.id].min}
              max={SETTINGS_LIMITS.durations[p.id].max}
              suffix=" min"
            />
          </SettingRow>
        ))}
      </View>

      <Text style={styles.hint}>
        Mudanças valem a partir do próximo play, se o timer estiver rodando.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    alignSelf: "center",
    width: "90%",
    gap: 24,
    paddingBottom: 40,
  },
  title: {
    textAlign: "center",
    color: colors.text,
    fontSize: fontSizes.lg,
    marginTop: 16,
  },
  card: {
    backgroundColor: colors.surfaceTranslucent,
    borderColor: colors.surface,
    borderWidth: 2,
    borderRadius: radii.lg,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  section: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  hint: {
    color: colors.muted,
    fontSize: fontSizes.sm,
    textAlign: "center",
  },
});
