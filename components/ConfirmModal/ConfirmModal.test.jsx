import { fireEvent, render } from "@testing-library/react-native";
import { ConfirmModal } from "./index";

describe("ConfirmModal", () => {
  it("does not dismiss when pressing inside the dialog, only on backdrop or Cancelar", async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();

    const { getByText, getByLabelText } = await render(
      <ConfirmModal
        visible={true}
        title="Excluir tarefa?"
        message="Confirmar exclusão"
        confirmLabel="Excluir"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    await fireEvent.press(getByText("Excluir tarefa?"));
    expect(onCancel).not.toHaveBeenCalled();

    await fireEvent.press(getByLabelText("Fechar diálogo"));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await fireEvent.press(getByText("Cancelar"));
    expect(onCancel).toHaveBeenCalledTimes(2);

    await fireEvent.press(getByText("Excluir"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
