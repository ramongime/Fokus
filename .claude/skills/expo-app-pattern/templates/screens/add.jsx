// app/add-resource/index.jsx
import { router } from "expo-router";
import FormResource from "../../components/FormResource";
import useResourceContext from "../../components/context/useResourceContext";

export default function AddResource() {
  const { addResource } = useResourceContext();

  const submit = (description) => {
    addResource(description);
    router.navigate("/resources");
  };

  return <FormResource onFormSubmit={submit} />;
}
