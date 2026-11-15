import { fireEvent, render } from "@testing-library/react-native";
import TaskItem from "./index";

// O gesto de deslizar depende do Reanimated nativo, que não roda no Jest
jest.mock(
  "react-native-gesture-handler/ReanimatedSwipeable",
  () =>
    ({ children }) =>
      children,
);

const setup = async () => {
  const handlers = {
    onToggleComplete: jest.fn(),
    onPressEdit: jest.fn(),
    onPressDelete: jest.fn(),
  };
  const utils = await render(
    <TaskItem text="Ler 10 páginas" pomodoros={2} {...handlers} />,
  );
  return { ...utils, ...handlers };
};

describe("TaskItem", () => {
  it("edits when the row text is tapped, without inline icons", async () => {
    const { getByText, getByLabelText, onPressEdit } = await setup();

    expect(getByText("2 focos")).toBeTruthy();
    await fireEvent.press(getByText("Ler 10 páginas"));
    expect(onPressEdit).toHaveBeenCalledTimes(1);
    expect(getByLabelText('Editar "Ler 10 páginas"')).toBeTruthy();
  });

  it("offers delete as an accessibility action for screen readers", async () => {
    const { getByLabelText, onPressDelete } = await setup();

    await fireEvent(
      getByLabelText('Editar "Ler 10 páginas"'),
      "accessibilityAction",
      {
        nativeEvent: { actionName: "delete" },
      },
    );
    expect(onPressDelete).toHaveBeenCalledTimes(1);
  });

  it("toggles completion from the check", async () => {
    const { getByLabelText, onToggleComplete } = await setup();

    await fireEvent.press(getByLabelText('Concluir "Ler 10 páginas"'));
    expect(onToggleComplete).toHaveBeenCalledTimes(1);
  });
});
