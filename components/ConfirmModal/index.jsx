import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSizes, radii } from "../../constants/theme";

// Pergunta de confirmação no visual do app. O Alert nativo não funciona na web.
export const ConfirmModal = ({
  visible,
  title,
  message,
  confirmLabel = "Confirmar",
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.dialog} accessibilityRole="alert">
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <Pressable
              style={styles.button}
              onPress={onCancel}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
              accessibilityRole="button"
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  dialog: {
    backgroundColor: colors.background,
    borderColor: colors.surface,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 24,
    width: "85%",
    maxWidth: 360,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: "bold",
    textAlign: "center",
  },
  message: {
    color: colors.muted,
    fontSize: fontSizes.md,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.surface,
    alignItems: "center",
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cancelText: {
    color: colors.muted,
    fontSize: fontSizes.md,
  },
  confirmText: {
    color: colors.background,
    fontSize: fontSizes.md,
    fontWeight: "bold",
  },
});
