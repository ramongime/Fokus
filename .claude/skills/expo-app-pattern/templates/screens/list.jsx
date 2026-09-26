// app/resources/index.jsx
import { router } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";
import useResourceContext from "../../components/context/useResourceContext";
import { PrimaryButton } from "../../components/PrimaryButton";
import { IconPlus } from "../../components/Icons";
import ResourceItem from "../../components/ResourceItem";
import { colors, fontSizes } from "../../constants/theme";

export default function Resources() {
  const { resources, deleteResource, toggleResourceCompleted } =
    useResourceContext();

  return (
    <View style={styles.container}>
      <View style={styles.wrapper}>
        <FlatList
          data={resources}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ResourceItem
              completed={item.completed}
              text={item.description}
              onToggleComplete={() => toggleResourceCompleted(item.id)}
              onPressEdit={() => router.navigate(`/edit-resource/${item.id}`)}
              onPressDelete={() => deleteResource(item.id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListHeaderComponent={<Text style={styles.title}>Lista:</Text>}
          ListFooterComponent={
            <View style={{ marginTop: 16 }}>
              <PrimaryButton
                title="Adicionar novo"
                icon={<IconPlus />}
                outline
                onPress={() => router.navigate("/add-resource")}
              />
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              Ainda não há itens na sua lista, que tal adicionar um?
            </Text>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
  },
  wrapper: {
    width: "90%",
  },
  title: {
    textAlign: "center",
    color: colors.text,
    fontSize: fontSizes.lg,
    margin: 16,
  },
  empty: {
    color: colors.muted,
    fontSize: fontSizes.md,
    textAlign: "center",
    marginTop: 40,
    marginBottom: 24,
  },
});
