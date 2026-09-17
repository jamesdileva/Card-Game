import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import SetsPanel from "./SetsPanel";

describe("SetsPanel", () => {
  it("renders every group with its sets, requirements, and effects", () => {
    render(<SetsPanel activeSynergies={[]} />);

    for (const heading of [
      "Pair sets",
      "Count sets",
      "Mixed sets",
      "God tier",
      "Archetypes"
    ]) {
      expect(
        screen.getByRole("heading", { name: new RegExp(heading) })
      ).toBeInTheDocument();
    }

    expect(screen.getByText("Triple Mythic")).toBeInTheDocument();
    expect(screen.getByText("Equip: 3× Mythic Multiplier")).toBeInTheDocument();
    expect(screen.getByText("Effect: payout +7x, +20% Luck")).toBeInTheDocument();
    expect(screen.getByText("GOD BUILD")).toBeInTheDocument();
    expect(screen.getByText("Steady Burn")).toBeInTheDocument();
  });

  it("badges only the equipped sets as active", () => {
    render(
      <SetsPanel
        activeSynergies={["🍀 Lucky Jackpot", " Triple Mythic"]}
      />
    );

    const badges = screen.getAllByText("ACTIVE");
    expect(badges).toHaveLength(2);

    const luckyRow = screen.getByText("Lucky Jackpot").closest("div").parentElement;
    const mythicRow = screen.getByText("Triple Mythic").closest("div").parentElement;
    expect(within(luckyRow).getByText("ACTIVE")).toBeInTheDocument();
    expect(within(mythicRow).getByText("ACTIVE")).toBeInTheDocument();

    const vaultRow = screen.getByText("Vault Buster").closest("div").parentElement;
    expect(within(vaultRow).queryByText("ACTIVE")).not.toBeInTheDocument();
  });

  it("shows no badges when nothing is equipped", () => {
    render(<SetsPanel activeSynergies={[]} />);
    expect(screen.queryByText("ACTIVE")).not.toBeInTheDocument();
  });
});
