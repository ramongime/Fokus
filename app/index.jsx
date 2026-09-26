import { router } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { FokusButton } from "../components/FokusButton";
import { colors, fontSizes } from "../constants/theme";

export default function Index() {
  return (
    <View style={styles.container}>
      <Image source={require("../assets/images/logo.png")} />
      <View style={styles.inner}>
        <Text style={styles.title}>
          Otimize sua {"\n"}produtividade,{"\n"}
          <Text style={styles.bold}>mergulhe no que{"\n"} importa</Text>
        </Text>
        <Image source={require("../assets/images/pomodoro.png")} />
        <FokusButton
          title="Quero iniciar!"
          onPress={() => router.navigate("/pomodoro")}
        />
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
