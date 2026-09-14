import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HiLo from "./HiLo";

function setup(overrides = {}) {
  const setMultiplier = vi.fn();
  const onStart = vi.fn();
  const onGuess = vi.fn();
  const utils = render(
    <HiLo
      multiplier={1}
      setMultiplier={setMultiplier}
      onStart={onStart}
      onGuess={onGuess}
      disabled={false}
      {...overrides}
    />
  );
  return { ...utils, setMultiplier, onStart, onGuess };
}

describe("HiLo start", () => {
  it("rolls a base number via onStart", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn().mockResolvedValue({ number: 42 });
    setup({ onStart });

    await user.click(screen.getByRole("button", { name: /Roll a number/ }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("42")).toBeInTheDocument();
  });

  it("keeps the roll prompt if start fails (null response)", async () => {
    const user = userEvent.setup();
    setup({ onStart: vi.fn().mockResolvedValue(null) });

    await user.click(screen.getByRole("button", { name: /Roll a number/ }));

    expect(
      await screen.findByText(/Roll a number to start/)
    ).toBeInTheDocument();
  });
});

describe("HiLo guessing", () => {
  it("shows live payout multipliers for both sides", async () => {
    const user = userEvent.setup();
    setup({ onStart: vi.fn().mockResolvedValue({ number: 50 }) });

    await user.click(screen.getByRole("button", { name: /Roll a number/ }));

    // 50 outcomes each way → floor(9500/50)/100 = x1.90
    expect(screen.getByText("x1.90 payout")).toBeInTheDocument();
  });

  it("disables impossible sides: higher than 100 has no winning rolls", async () => {
    const user = userEvent.setup();
    setup({ onStart: vi.fn().mockResolvedValue({ number: 100 }) });

    await user.click(screen.getByRole("button", { name: /Roll a number/ }));

    const higher = screen.getByRole("button", { name: /▲ Higher/ });
    expect(higher).toBeDisabled();
    expect(higher).toHaveTextContent("no winning rolls");
    // lower than 100 → 99 outcomes → x0.95
    expect(screen.getByText("x0.95 payout")).toBeInTheDocument();
  });

  it("disables impossible sides: lower than 1 has no winning rolls", async () => {
    const user = userEvent.setup();
    setup({ onStart: vi.fn().mockResolvedValue({ number: 1 }) });

    await user.click(screen.getByRole("button", { name: /Roll a number/ }));

    expect(screen.getByRole("button", { name: /▼ Lower/ })).toBeDisabled();
  });

  it("guesses a direction and chains the new base number", async () => {
    const user = userEvent.setup();
    let call = 0;
    const onGuess = vi.fn().mockImplementation(async () => {
      call += 1;
      return call === 1
        ? { win: true, payout: 190, number: 75 }
        : { win: false, payout: 0, number: 10 };
    });

    render(
      <HiLo
        multiplier={1}
        setMultiplier={vi.fn()}
        onStart={vi.fn().mockResolvedValue({ number: 50 })}
        onGuess={onGuess}
        disabled={false}
      />
    );

    await user.click(screen.getByRole("button", { name: /Roll a number/ }));
    await user.click(screen.getByRole("button", { name: /▲ Higher/ }));

    expect(onGuess).toHaveBeenCalledWith("higher");
    expect(screen.getByText(/Won \$190 — 50 → 75/)).toBeInTheDocument();

    // chained: next round's base is the rolled 75
    await user.click(screen.getByRole("button", { name: /▼ Lower/ }));
    expect(onGuess).toHaveBeenCalledWith("lower");
    expect(screen.getByText(/Lost \$100 — 75 → 10/)).toBeInTheDocument();
  });

  it("blocks starting and guessing when externally disabled", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn().mockResolvedValue({ number: 50 });
    const onGuess = vi.fn();
    setup({ onStart, onGuess, disabled: true });

    const rollBtn = screen.getByRole("button", { name: /Roll a number/ });

    expect(rollBtn).toBeDisabled();
    await user.click(rollBtn);
    expect(onStart).not.toHaveBeenCalled();
  });
});

describe("HiLo reroll + multipliers", () => {
  it("offers a free new-number reroll after starting", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn()
      .mockResolvedValueOnce({ number: 50 })
      .mockResolvedValueOnce({ number: 80 });

    render(
      <HiLo multiplier={1} setMultiplier={vi.fn()} onStart={onStart} onGuess={vi.fn()} />
    );

    await user.click(screen.getByRole("button", { name: /Roll a number/ }));
    await user.click(screen.getByRole("button", { name: /New number \(free\)/ }));

    expect(onStart).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("80")).toBeInTheDocument();
  });

  it("passes multiplier picks up to the parent", async () => {
    const user = userEvent.setup();
    const { setMultiplier } = setup();

    await user.click(screen.getByText("x5"));

    expect(setMultiplier).toHaveBeenCalledWith(5);
  });
});
