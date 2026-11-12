import { Redirect, router } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import useSettingsContext from "../components/context/useSettingsContext";
import { FokusButton } from "../components/FokusButton";
import { colors, fontSizes } from "../constants/theme";

const appIcon = require("../assets/images/icon.png");

export default function Index() {
  const { settings, isLoaded, markWelcomeSeen } = useSettingsContext();

  // Enquanto as configurações carregam, mantém o ícone na tela (evita piscar fundo vazio)
  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <Image source={appIcon} style={styles.icon} />
      </View>
    );
  }
  // Depois do primeiro uso, o app abre direto no timer
  if (settings.hasSeenWelcome) {
    return <Redirect href="/pomodoro" />;
  }

  const start = () => {
    markWelcomeSeen();
    router.navigate("/pomodoro");
  };

  return (
    <View style={styles.container}>
      <Image source={appIcon} style={styles.icon} />
      <View style={styles.inner}>
        <Text style={styles.title}>
          Otimize sua {"\n"}produtividade,{"\n"}
          <Text style={styles.bold}>mergulhe no que{"\n"} importa</Text>
        </Text>
        <Image source={require("../assets/images/pomodoro.png")} />
        <FokusButton title="Quero iniciar!" onPress={start} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    gap: 40,
  },
  // Mesmo ícone do app, com cantos arredondados como na tela inicial do iOS
  icon: {
    width: 96,
    height: 96,
    borderRadius: 22,
  },
  inner: {
    gap: 16,
  },
  title: {
    color: colors.text,
    textAlign: "center",
    fontSize: fontSizes.lg,
  },
  bold: {
    fontWeight: "bold",
  },
});
