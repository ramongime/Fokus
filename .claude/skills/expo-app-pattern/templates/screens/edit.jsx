// app/edit-resource/[id].jsx
import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import FormResource from "../../components/FormResource";
import useResourceContext from "../../components/context/useResourceContext";

export default function EditResource() {
  const { id } = useLocalSearchParams();
  const { resources, updateResource } = useResourceContext();

  const resource = resources.find((r) => r.id === id);

  const submit = (description) => {
    updateResource(id, description);
    router.navigate("/resources");
  };

  if (!resource) {
    return (
      <View>
        <Text>Não foi encontrado um item com o id: {id}</Text>
      </View>
    );
  }

  return (
    <FormResource defaultValue={resource.description} onFormSubmit={submit} />
  );
}
