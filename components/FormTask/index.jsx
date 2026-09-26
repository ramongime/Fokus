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

export default function FormTask({ onFormSubmit, defaultValue = "" }) {
  const [description, setDescription] = useState(defaultValue);

  const submitTask = () => {
    if (!description) {
      return;
    }
    onFormSubmit(description);
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
    gap: 24,
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
    borderWidth: 2,
    borderRadius: radii.sm,
    color: colors.text,
    fontSize: fontSizes.md,
    padding: 16,
    height: 120,
    textAlignVertical: "top",
  },
});
