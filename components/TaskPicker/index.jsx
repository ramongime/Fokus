import { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, fontSizes, radii } from "../../constants/theme";

// Escolhe a tarefa em que o foco está sendo feito
// onCreate (opcional): cria uma tarefa nova ali mesmo e já vincula ao foco
export const TaskPicker = ({ tasks, currentTask, onSelect, onCreate }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const pendingTasks = tasks.filter((t) => !t.completed);

  const close = () => {
    setOpen(false);
    setDraft("");
  };

  const select = (taskId) => {
    onSelect(taskId);
    close();
  };

  const create = () => {
    const description = draft.trim();
    if (!description) return;
    onCreate(description);
    close();
  };

  return (
    <>
      <Pressable
        style={styles.trigger}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={
          currentTask
            ? `Focando em ${currentTask.description}. Toque para trocar`
            : "Escolher uma tarefa para o foco"
        }
        hitSlop={8}
      >
        {currentTask ? <View style={styles.triggerDot} /> : null}
        <Text
          style={[styles.triggerText, !currentTask && styles.triggerEmpty]}
          numberOfLines={1}
        >
          {currentTask ? currentTask.description : "Escolher tarefa"}
        </Text>
        <Svg width={12} height={12} viewBox="0 0 24 24">
          <Path
            d="M6 9l6 6 6-6"
            stroke={colors.muted}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.backdrop}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <View style={styles.sheet}>
            <Text style={styles.title}>No que você vai focar?</Text>
            {onCreate ? (
              <View style={styles.createRow}>
                <TextInput
                  accessibilityLabel="Nova tarefa"
                  style={styles.createInput}
                  maxLength={120}
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={create}
                  placeholder="Nova tarefa..."
                  placeholderTextColor={colors.muted}
                  returnKeyType="done"
                  autoFocus={pendingTasks.length === 0}
                />
                <Pressable
                  style={[
                    styles.createButton,
                    !draft.trim() && styles.disabled,
                  ]}
                  onPress={create}
                  disabled={!draft.trim()}
                  accessibilityRole="button"
                  accessibilityLabel="Criar tarefa e focar nela"
                >
                  <Text style={styles.createButtonText}>＋</Text>
                </Pressable>
              </View>
            ) : null}
            <FlatList
              data={pendingTasks}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.option,
                    currentTask?.id === item.id && styles.optionActive,
                  ]}
                  onPress={() => select(item.id)}
                >
                  <Text style={styles.optionText}>{item.description}</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.empty}>
                  {onCreate
                    ? "Nenhuma tarefa pendente. Digite uma acima."
                    : "Nenhuma tarefa pendente. Crie uma na lista de tarefas."}
                </Text>
              }
              ListFooterComponent={
                currentTask ? (
                  <Pressable style={styles.clear} onPress={() => select(null)}>
                    <Text style={styles.clearText}>Focar sem tarefa</Text>
                  </Pressable>
                ) : null
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Linha única e centralizada, sem caixa: só um ponto, o nome da tarefa e a seta
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    maxWidth: "100%",
    gap: 8,
    paddingVertical: 6,
  },
  triggerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  triggerText: {
    flexShrink: 1,
    color: colors.text,
    fontSize: fontSizes.md,
  },
  triggerEmpty: {
    color: colors.muted,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    backgroundColor: colors.background,
    borderColor: colors.surface,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 24,
    width: "85%",
    maxWidth: 420,
    maxHeight: "70%",
    gap: 16,
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: "bold",
    textAlign: "center",
  },
  createRow: {
    flexDirection: "row",
    gap: 8,
  },
  createInput: {
    flex: 1,
    backgroundColor: colors.surfaceTranslucent,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: fontSizes.md,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonText: {
    color: colors.background,
    fontSize: fontSizes.lg,
    fontWeight: "bold",
  },
  disabled: {
    opacity: 0.4,
  },
  option: {
    backgroundColor: colors.surfaceTranslucent,
    borderRadius: radii.sm,
    padding: 12,
  },
  optionActive: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  optionText: {
    color: colors.text,
    fontSize: fontSizes.md,
  },
  empty: {
    color: colors.muted,
    fontSize: fontSizes.md,
    textAlign: "center",
  },
  clear: {
    marginTop: 16,
    alignItems: "center",
  },
  clearText: {
    color: colors.primary,
    fontSize: fontSizes.md,
  },
});
