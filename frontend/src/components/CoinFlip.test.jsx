import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CoinFlip from "./CoinFlip";

function setup(overrides = {}) {
  const setMultiplier = vi.fn();
  const onFlip = vi.fn();
  const utils = render(
    <CoinFlip
      multiplier={1}
      setMultiplier={setMultiplier}
      onFlip={onFlip}
      flipping={false}
      result={null}
      {...overrides}
    />
  );
  return { ...utils, setMultiplier, onFlip };
}

describe("CoinFlip", () => {
  it("prompts for a pick before the first flip", () => {
    setup();

    expect(screen.getByText("Pick a side and flip")).toBeInTheDocument();
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("flips with the selected side", async () => {
    const user = userEvent.setup();
    const { onFlip } = setup();

    await user.click(screen.getByText("🌑 Tails"));
    await user.click(screen.getByRole("button", { name: /Flip \$100/ }));

    expect(onFlip).toHaveBeenCalledWith("tails");
  });

  it("scales the bet with the multiplier", async () => {
    const user = userEvent.setup();
    const { onFlip, setMultiplier } = setup({ multiplier: 5 });

    await user.click(screen.getByRole("button", { name: /Flip \$500/ }));

    expect(onFlip).toHaveBeenCalledWith("heads");
    expect(setMultiplier).not.toHaveBeenCalled();
    // x10 tile present
    expect(screen.getByText("x10")).toBeInTheDocument();
  });

  it("locks all inputs while flipping", () => {
    setup({ flipping: true });

    expect(screen.getByRole("button", { name: /Flipping\.\.\./ })).toBeDisabled();
    expect(screen.getByText("🪙 Heads").closest("button")).toBeDisabled();
    expect(screen.getByText("🌑 Tails").closest("button")).toBeDisabled();
    expect(screen.getAllByText("Flipping...").length).toBeGreaterThanOrEqual(1);
  });

  it("respects an external disabled prop (parent lock)", () => {
    setup({ disabled: true });

    expect(screen.getByRole("button", { name: /Flip \$100/ })).toBeDisabled();
  });

  it("shows a winning payout in green", () => {
    setup({ result: { win: true, flip: "heads", payout: 210 } });

    expect(screen.getByText(/Won \$210/)).toBeInTheDocument();
    expect(screen.getByText("H")).toBeInTheDocument();
  });

  it("shows the losing side and lost bet", () => {
    setup({ result: { win: false, flip: "tails", payout: 0 } });

    expect(screen.getByText(/Lost \$100 — it landed tails/)).toBeInTheDocument();
    expect(screen.getByText("T")).toBeInTheDocument();
  });
});
