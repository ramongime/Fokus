import { useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { ConfirmModal } from "../components/ConfirmModal";
import {
  buildBackup,
  describeBackup,
  getBackupFileName,
  parseBackup,
} from "../components/context/backupLogic";
import { shareBackup } from "../components/context/shareBackup";
import useSettingsContext from "../components/context/useSettingsContext";
import useTaskContext from "../components/context/useTaskContext";
import { FokusButton } from "../components/FokusButton";
import useTimerSummaryContext from "../components/context/useTimerSummaryContext";
import { RestoreModal } from "../components/RestoreModal";
import { SettingRow } from "../components/SettingRow";
import { Stepper } from "../components/Stepper";
import { pomodoro } from "../constants/pomodoro";
import { SETTINGS_LIMITS } from "../constants/settings";
import { colors, fontSizes, radii } from "../constants/theme";

export default function Settings() {
  const {
    settings,
    setAutoStartCycles,
    setVibrate,
    setDistinctSounds,
    setDuration,
    setLongBreakInterval,
    setDailyFocusGoal,
    replaceSettings,
  } = useSettingsContext();
  const { tasks, importTasks } = useTaskContext();
  const { history, importHistory } = useTimerSummaryContext();
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreError, setRestoreError] = useState(null);
  // Backup lido e validado, esperando a confirmação
  const [pendingBackup, setPendingBackup] = useState(null);
  // { text, error }: resultado da última exportação ou restauração
  const [dataMessage, setDataMessage] = useState(null);

  const exportBackup = async () => {
    const now = Date.now();
    try {
      const shared = await shareBackup({
        fileName: getBackupFileName(now),
        json: buildBackup({ settings, tasks, history, now }),
      });
      if (shared) {
        setDataMessage({ text: "Backup exportado.", error: false });
      }
    } catch (e) {
      console.warn("Erro ao exportar backup", e);
      setDataMessage({
        text: "Não foi possível exportar o backup.",
        error: true,
      });
    }
  };

  const readBackup = (text) => {
    const result = parseBackup(text);
    if (!result.ok) {
      setRestoreError(result.error);
      return;
    }
    setRestoreError(null);
    setRestoreOpen(false);
    setPendingBackup(result.data);
  };

  const restoreBackup = () => {
    const {
      settings: savedSettings,
      tasks: savedTasks,
      history: savedHistory,
    } = pendingBackup;
    if (savedSettings) {
      replaceSettings(savedSettings);
    }
    importTasks(savedTasks);
    importHistory(savedHistory);
    setPendingBackup(null);
    setDataMessage({
      text: `Backup restaurado: ${describeBackup(pendingBackup)}.`,
      error: false,
    });
  };

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
            accessibilityLabel="Emendar ciclos"
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
        <SettingRow
          label="Vibrar no fim do ciclo"
          description="Junto com a notificação, mesmo com a tela bloqueada."
        >
          <Switch
            value={settings.vibrate}
            onValueChange={setVibrate}
            accessibilityLabel="Vibrar no fim do ciclo"
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor={colors.text}
          />
        </SettingRow>
        <SettingRow
          label="Sons diferentes por ciclo"
          description="Usa um som para o foco e outro para as pausas."
        >
          <Switch
            value={settings.distinctSounds}
            onValueChange={setDistinctSounds}
            accessibilityLabel="Sons diferentes por ciclo"
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
            label="intervalo da pausa longa"
          />
        </SettingRow>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Metas</Text>
        <SettingRow
          label="Meta diária de focos"
          description="Acompanhe no histórico quantos focos faltam para a meta."
        >
          <Stepper
            value={settings.dailyFocusGoal}
            onChange={setDailyFocusGoal}
            min={SETTINGS_LIMITS.dailyFocusGoal.min}
            max={SETTINGS_LIMITS.dailyFocusGoal.max}
            suffix=" focos"
            label="meta diária de focos"
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
              label={`duração de ${p.display.toLowerCase()}`}
            />
          </SettingRow>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Seus dados</Text>
        <Text style={styles.dataText}>
          Tudo fica só neste aparelho. Exporte um backup para guardar ou levar
          suas tarefas, histórico e configurações para outro aparelho.
        </Text>
        <View style={styles.dataActions}>
          <FokusButton outline title="Exportar backup" onPress={exportBackup} />
          <FokusButton
            outline
            title="Restaurar backup"
            onPress={() => {
              setRestoreError(null);
              setRestoreOpen(true);
            }}
          />
        </View>
        {dataMessage ? (
          <Text
            style={[styles.dataMessage, dataMessage.error && styles.dataError]}
            accessibilityLiveRegion="polite"
          >
            {dataMessage.text}
          </Text>
        ) : null}
      </View>

      <RestoreModal
        // Remonta a cada abertura para começar com o campo vazio
        key={restoreOpen ? "restore-open" : "restore-closed"}
        visible={restoreOpen}
        error={restoreError}
        onSubmit={readBackup}
        onCancel={() => setRestoreOpen(false)}
      />
      <ConfirmModal
        visible={pendingBackup != null}
        title="Restaurar backup?"
        message={
          pendingBackup
            ? `Encontrado: ${describeBackup(pendingBackup)}. As configurações serão substituídas; tarefas e histórico são somados aos atuais.`
            : ""
        }
        confirmLabel="Restaurar"
        onConfirm={restoreBackup}
        onCancel={() => setPendingBackup(null)}
      />

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
    maxWidth: 480,
    gap: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: "bold",
    marginTop: 16,
  },
  card: {
    backgroundColor: colors.surfaceTranslucent,
    borderColor: colors.surface,
    borderWidth: 1,
    borderRadius: radii.md,
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
  dataText: {
    color: colors.muted,
    fontSize: fontSizes.sm,
    marginTop: 8,
  },
  dataActions: {
    gap: 12,
    marginTop: 16,
  },
  dataMessage: {
    color: colors.success,
    fontSize: fontSizes.sm,
    marginTop: 12,
  },
  dataError: {
    color: colors.danger,
  },
  hint: {
    color: colors.muted,
    fontSize: fontSizes.sm,
    textAlign: "center",
  },
});
