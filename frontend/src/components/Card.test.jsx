import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Card from "./Card";

describe("Card", () => {
  it("renders the display name and rarity label", () => {
    render(<Card id="safety_net" rarity="rare" />);

    expect(screen.getByText("Safety Net")).toBeInTheDocument();
    expect(screen.getByText("rare")).toBeInTheDocument();
  });

  it("shows a count badge when copies exist", () => {
    render(<Card id="reroll" rarity="common" count={4} />);

    expect(screen.getByText("×4")).toBeInTheDocument();
  });

  it("hides the count badge when count is not provided", () => {
    render(<Card id="reroll" rarity="common" />);

    expect(screen.queryByText(/^×\d+$/)).not.toBeInTheDocument();
  });

  it("renders the ✦ mutation badge for mutated cards", () => {
    render(<Card id="double_down" rarity="epic" mutation={1.13} />);

    expect(screen.getByText("✦13%")).toBeInTheDocument();
  });

  it("omits the ✦ badge when mutation is trivial (≤1)", () => {
    render(<Card id="double_down" rarity="epic" mutation={1} />);

    expect(screen.queryByText(/✦/)).not.toBeInTheDocument();
  });

  it("marks corrupted cards with ☠ badge text and red ring", () => {
    const { container } = render(
      <Card id="mythic_multiplier" rarity="legendary" corrupted />
    );

    expect(screen.getByText(/corrupted/)).toBeInTheDocument();
    expect(container.firstChild.className).toContain("ring-red-600");
    // non-corrupted cards never show the corrupted label
  });

  it("non-corrupted cards show the plain rarity instead", () => {
    render(<Card id="lucky_charm" rarity="common" />);

    expect(screen.queryByText("corrupted")).not.toBeInTheDocument();
  });

  it("hover title includes name, effect text and corruption note", () => {
    const { container } = render(
      <Card id="safety_net" rarity="rare" corrupted mutation={1.2} />
    );

    const title = container.firstChild.getAttribute("title");

    expect(title).toContain("Safety Net · rare");
    expect(title).toContain("Refunds 20% of your bet");
    expect(title).toContain("Mutation: +20% effect strength");
    expect(title).toContain("CORRUPTED: ×2 effect but −15% XP");
  });

  it("hover title omits sections that do not apply", () => {
    const { container } = render(<Card id="wild_symbol" rarity="common" />);
    const title = container.firstChild.getAttribute("title");

    expect(title).toContain("Wild Symbol · common");
    expect(title).toContain("+30% Luck");
    expect(title).not.toContain("Mutation:");
    expect(title).not.toContain("CORRUPTED");
  });
});
