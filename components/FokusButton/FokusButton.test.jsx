import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { FokusButton } from "./index";
import { Text } from "react-native";

describe("FokusButton", () => {
  it("renders with title and calls onPress", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <FokusButton title="Clique aqui" onPress={onPress} />,
    );

    const button = getByText("Clique aqui");
    expect(button).toBeTruthy();

    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders both Começar and Pausar layers in toggle mode", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <FokusButton running={false} onPress={onPress} />,
    );

    expect(getByText("Começar")).toBeTruthy();
    expect(getByText("Pausar")).toBeTruthy();
  });

  it("supports running=true in toggle mode", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(
      <FokusButton running={true} onPress={onPress} />,
    );

    expect(getByText("Começar")).toBeTruthy();
    expect(getByText("Pausar")).toBeTruthy();
  });

  it("renders custom icon in non-toggle mode", async () => {
    const { getByText } = await render(
      <FokusButton
        title="Salvar"
        icon={<Text>IconCustom</Text>}
        onPress={() => {}}
      />,
    );

    expect(getByText("Salvar")).toBeTruthy();
    expect(getByText("IconCustom")).toBeTruthy();
  });
});
