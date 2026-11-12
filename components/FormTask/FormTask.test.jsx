import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import FormTask from "./index";

describe("FormTask", () => {
  it("renders with default value and handles submission", async () => {
    const onFormSubmit = jest.fn();
    const { getByRole, getByDisplayValue } = await render(
      <FormTask defaultValue="Tarefa inicial" onFormSubmit={onFormSubmit} />,
    );

    expect(getByDisplayValue("Tarefa inicial")).toBeTruthy();
    const saveButton = getByRole("button", { name: "Salvar" });
    fireEvent.press(saveButton);

    expect(onFormSubmit).toHaveBeenCalledWith("Tarefa inicial");
  });

  it("trims and truncates description to 120 chars on submit", async () => {
    const onFormSubmit = jest.fn();
    const longDefault = `  ${"c".repeat(150)}  `;
    const { getByRole } = await render(
      <FormTask defaultValue={longDefault} onFormSubmit={onFormSubmit} />,
    );

    const saveButton = getByRole("button", { name: "Salvar" });
    fireEvent.press(saveButton);

    expect(onFormSubmit).toHaveBeenCalledWith("c".repeat(120));
  });

  it("ignores empty or whitespace-only submission", async () => {
    const onFormSubmit = jest.fn();
    const { getByRole } = await render(
      <FormTask defaultValue="   " onFormSubmit={onFormSubmit} />,
    );

    const saveButton = getByRole("button", { name: "Salvar" });
    fireEvent.press(saveButton);

    expect(onFormSubmit).not.toHaveBeenCalled();
  });
});
