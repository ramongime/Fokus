import { fireEvent, render } from "@testing-library/react-native";
import { useNavigation } from "expo-router";
import { MenuToggleButton } from "./index";

jest.mock("@expo/vector-icons", () => ({
  Feather: "Feather",
}));

jest.mock("expo-router", () => ({
  useNavigation: jest.fn(),
}));

describe("MenuToggleButton", () => {
  const mockToggleDrawer = jest.fn();
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with correct accessibility attributes", async () => {
    useNavigation.mockReturnValue({
      toggleDrawer: mockToggleDrawer,
      dispatch: mockDispatch,
    });

    const { getByRole } = await render(<MenuToggleButton />);
    const button = getByRole("button");

    expect(button).toBeTruthy();
    expect(button.props.accessibilityLabel).toBe("Abrir menu de navegação");
  });

  it("calls navigation.toggleDrawer when pressed and method exists", async () => {
    useNavigation.mockReturnValue({
      toggleDrawer: mockToggleDrawer,
      dispatch: mockDispatch,
    });

    const { getByRole } = await render(<MenuToggleButton />);
    const button = getByRole("button");

    await fireEvent.press(button);

    expect(mockToggleDrawer).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("falls back to navigation.dispatch when toggleDrawer is not a function", async () => {
    useNavigation.mockReturnValue({
      toggleDrawer: undefined,
      dispatch: mockDispatch,
    });

    const { getByRole } = await render(<MenuToggleButton />);
    const button = getByRole("button");

    await fireEvent.press(button);

    expect(mockDispatch).toHaveBeenCalledWith({ type: "TOGGLE_DRAWER" });
  });
});
