import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, fontSizes, radii } from "../../constants/theme";

// Campo para colar o texto de um backup. Funciona igual no celular e na web,
// sem precisar de seletor de arquivos.
export const RestoreModal = ({ visible, error, onSubmit, onCancel }) => {
  const [text, setText] = useState("");
  const close = () => {
    setText("");
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Fechar diálogo"
        />
        <View style={styles.dialog}>
          <Text style={styles.title}>Restaurar backup</Text>
          <Text style={styles.message}>
            Abra o arquivo de backup, copie todo o texto e cole aqui.
          </Text>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            placeholder='{ "app": "fokus", ... }'
            placeholderTextColor={colors.muted}
            accessibilityLabel="Texto do backup"
          />
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Pressable
              style={styles.button}
              onPress={close}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                styles.confirmButton,
                !text.trim() && styles.disabled,
              ]}
              onPress={() => onSubmit(text)}
              disabled={!text.trim()}
              accessibilityRole="button"
              accessibilityState={{ disabled: !text.trim() }}
            >
              <Text style={styles.confirmText}>Continuar</Text>
            </Pressable>
          </View>
        </View>
      </View>
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
    width: "90%",
    maxWidth: 480,
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
    fontSize: fontSizes.sm,
    textAlign: "center",
  },
  input: {
    minHeight: 140,
    maxHeight: 240,
    borderColor: colors.surface,
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: 12,
    color: colors.text,
    fontSize: fontSizes.sm,
    textAlignVertical: "top",
  },
  error: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
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
  disabled: {
    opacity: 0.5,
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
