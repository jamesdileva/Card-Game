import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeckPanel from "./DeckPanel";

const INV = [
  { id: "lucky_charm", rarity: "common", count: 2 },
  { id: "reroll", rarity: "common", count: 1 },
  { id: "mythic_multiplier", rarity: "legendary", count: 1 }
];

function setup(deck = [null, null, null], inventory = INV) {
  const setDeck = vi.fn();
  const setToast = vi.fn();
  render(
    <DeckPanel deck={deck} inventory={inventory} setDeck={setDeck} setToast={setToast} />
  );
  return { setDeck, setToast };
}

describe("DeckPanel click-to-equip", () => {
  it("equips a clicked card into the first empty slot", async () => {
    const user = userEvent.setup();
    const { setDeck } = setup();

    await user.click(screen.getByTitle(/Lucky Charm — click to equip/));

    expect(setDeck).toHaveBeenCalledTimes(1);
    const updater = setDeck.mock.calls[0][0];
    const prev = [null, null, null];
    expect(updater(prev)).toEqual(["lucky_charm", null, null]);
  });

  it("fills the earliest empty slot, not slot 0 blindly", async () => {
    const user = userEvent.setup();
    const { setDeck } = setup(["reroll", null, "mythic_multiplier"]);

    await user.click(screen.getByTitle(/Lucky Charm — click to equip/));

    const updater = setDeck.mock.calls[0][0];
    expect(updater(["reroll", null, "mythic_multiplier"])).toEqual([
      "reroll",
      "lucky_charm",
      "mythic_multiplier"
    ]);
  });

  it("refuses to exceed owned copies and explains why", async () => {
    const user = userEvent.setup();
    const { setDeck, setToast } = setup(["reroll", null, null]);

    // reroll: 1 copy owned, already equipped
    await user.click(screen.getByTitle(/Reroll — click to equip/));

    expect(setDeck).not.toHaveBeenCalled();
    expect(setToast).toHaveBeenCalledWith("Only 1× Reroll owned");
  });

  it("rejects equips when the deck is full", async () => {
    const user = userEvent.setup();
    const { setDeck, setToast } = setup([
      "lucky_charm",
      "lucky_charm",
      "mythic_multiplier"
    ]);

    await user.click(screen.getByTitle(/Reroll — click to equip/));

    expect(setDeck).not.toHaveBeenCalled();
    expect(setToast).toHaveBeenCalledWith("Deck full — remove a card first");
  });

  it("allows stacking up to the owned copy count", async () => {
    const user = userEvent.setup();
    const { setDeck } = setup(["lucky_charm", null, null]); // 2 owned

    await user.click(screen.getByTitle(/Lucky Charm — click to equip/));

    const updater = setDeck.mock.calls[0][0];
    expect(updater(["lucky_charm", null, null])).toEqual([
      "lucky_charm",
      "lucky_charm",
      null
    ]);
  });
});

describe("DeckPanel pool display", () => {
  it("shows the equipped-copy badge on pooled cards", () => {
    setup(["lucky_charm", null, null]);

    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("dims cards whose copies are all equipped", () => {
    setup(["reroll", null, null]);
    const card = screen.getByTitle(/Reroll — click to equip/);

    expect(card.className).toContain("opacity-40");
  });

  it("does not dim cards with spare copies", () => {
    setup(["lucky_charm", null, null]);
    const card = screen.getByTitle(/Lucky Charm — click to equip/);

    expect(card.className).not.toContain("opacity-40");
  });

  it("renders empty-slot placeholders and an empty-pool message", () => {
    render(
      <DeckPanel deck={[null, null, null]} inventory={[]} setDeck={vi.fn()} setToast={vi.fn()} />
    );

    expect(screen.getAllByText("Drop Card")).toHaveLength(3);
    expect(screen.getByText(/Open crates in the Store tab/)).toBeInTheDocument();
  });
});
