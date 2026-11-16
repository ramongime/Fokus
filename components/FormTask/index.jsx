import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { FokusButton } from "../../components/FokusButton";
import { IconSave } from "../../components/Icons";
import { colors, fontSizes, radii } from "../../constants/theme";

// footer (opcional): conteúdo extra abaixo do cartão, ex.: "Excluir tarefa" na edição
export default function FormTask({
  onFormSubmit,
  defaultValue = "",
  footer = null,
}) {
  const [description, setDescription] = useState(defaultValue);

  const submitTask = () => {
    const clean = description.trim().slice(0, 120);
    if (!clean) {
      return;
    }
    onFormSubmit(clean);
    setDescription("");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <Text style={styles.title}>
            {defaultValue ? "Editar tarefa" : "Nova tarefa"}
          </Text>
          <View style={styles.card}>
            <Text style={styles.label}>Em que você está trabalhando?</Text>
            <TextInput
              accessibilityLabel="Descrição da tarefa"
              style={styles.input}
              maxLength={120}
              numberOfLines={10}
              multiline={true}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex.: estudar React Native"
              placeholderTextColor={colors.muted}
            />
            <FokusButton
              title="Salvar"
              icon={<IconSave />}
              onPress={submitTask}
            />
          </View>
          {footer}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
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
    padding: 20,
    gap: 16,
  },
  label: {
    color: colors.text,
    fontSize: fontSizes.md,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.surface,
    borderWidth: 1,
    borderRadius: radii.sm,
    color: colors.text,
    fontSize: fontSizes.md,
    padding: 16,
    paddingTop: 16,
    height: 120,
    textAlignVertical: "top",
  },
});
