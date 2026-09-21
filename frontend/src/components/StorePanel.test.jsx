import { describe, it, expect, vi, afterEach } from "vitest";
import { act } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StorePanel from "./StorePanel";

function setup(props = {}) {
  const onUpgradeXP = vi.fn();
  const onUpgradePayout = vi.fn();
  const onOpenCrate = vi.fn();
  render(
    <StorePanel
      onUpgradeXP={onUpgradeXP}
      onUpgradePayout={onUpgradePayout}
      onOpenCrate={onOpenCrate}
      {...props}
    />
  );
  return { onUpgradeXP, onUpgradePayout, onOpenCrate };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("StorePanel upgrades", () => {
  it("calls the right handler for each upgrade button", async () => {
    const user = userEvent.setup();
    const { onUpgradeXP, onUpgradePayout } = setup();

    await user.click(screen.getByText(/⚡ XP Boost/));
    await user.click(screen.getByText(/💰 Payout Boost/));

    expect(onUpgradeXP).toHaveBeenCalledTimes(1);
    expect(onUpgradePayout).toHaveBeenCalledTimes(1);
  });

  it("disables all buttons while busy (double-click guard)", () => {
    render(
      <StorePanel
        onUpgradeXP={vi.fn()}
        onUpgradePayout={vi.fn()}
        onOpenCrate={vi.fn()}
        busy
      />
    );

    for (const label of [
      /⚡ XP Boost/,
      /💰 Payout Boost/,
      /BASIC/,
      /PREMIUM/,
      /ELITE/,
      /CORRUPTED/
    ]) {
      expect(screen.getByText(label).closest("button")).toBeDisabled();
    }
  });

  it("busy buttons do not fire handlers", async () => {
    const user = userEvent.setup();
    const { onOpenCrate } = setup({ busy: true });

    await user.click(screen.getByText("BASIC"));

    expect(onOpenCrate).not.toHaveBeenCalled();
  });
});

describe("StorePanel crates", () => {
  it("opens crates with their type ids", async () => {
    const user = userEvent.setup();
    const { onOpenCrate } = setup();

    await user.click(screen.getByText("BASIC"));
    await user.click(screen.getByText("PREMIUM"));
    await user.click(screen.getByText("ELITE"));
    await user.click(screen.getByText("CORRUPTED"));

    expect(onOpenCrate).toHaveBeenNthCalledWith(1, "basic");
    expect(onOpenCrate).toHaveBeenNthCalledWith(2, "premium");
    expect(onOpenCrate).toHaveBeenNthCalledWith(3, "elite");
    expect(onOpenCrate).toHaveBeenNthCalledWith(4, "corrupted");
  });

  it("shows a live countdown and locks the timed crate until ready", async () => {
    vi.useFakeTimers();
    const unlockAt = Date.now() + 5000;
    const { onOpenCrate } = setup({
      pendingCrates: [{ id: "t1", type: "timed", unlockAt }]
    });

    // locked while counting down
    const timedBtn = screen.getByText("TIMED").closest("button");
    expect(timedBtn).toBeDisabled();

    // tick the 1s interval past the unlock point
    for (let i = 0; i < 6; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }

    expect(screen.getByText("OPEN!").closest("button")).toBeEnabled();
    expect(screen.getByText("ready to open")).toBeInTheDocument();

    // fireEvent is synchronous — safe with fake timers active
    fireEvent.click(screen.getByText("OPEN!").closest("button"));
    expect(onOpenCrate).toHaveBeenCalledWith(null, "t1");
  });

  it("no pending crate → timed crate is purchasable", async () => {
    const user = userEvent.setup();
    const { onOpenCrate } = setup();

    const timedBtn = screen.getByText("TIMED").closest("button");

    expect(timedBtn).toBeEnabled();
    await user.click(timedBtn);
    expect(onOpenCrate).toHaveBeenCalledWith("timed");
  });

  it("lists free bonus pulls with their own OPEN buttons", async () => {
    const user = userEvent.setup();
    const { onOpenCrate } = setup({
      pendingCrates: [{ id: "e1", type: "elite", unlockAt: Date.now() - 1000 }]
    });

    expect(screen.getByText(/Unopened bonus pulls/)).toBeInTheDocument();
    const openBtn = screen.getByText("OPEN").closest("button");
    expect(openBtn).toBeEnabled();
    await user.click(openBtn);
    expect(onOpenCrate).toHaveBeenCalledWith(null, "e1");
  });

  it("a locked timed crate and a ready bonus pull coexist", async () => {
    const { onOpenCrate } = setup({
      pendingCrates: [
        { id: "t1", type: "timed", unlockAt: Date.now() + 60000 },
        { id: "e1", type: "elite", unlockAt: Date.now() - 1000 }
      ]
    });

    // timed still counting down and locked…
    expect(screen.getByText("TIMED").closest("button")).toBeDisabled();
    // …while the bonus pull opens independently by id
    fireEvent.click(screen.getByText("OPEN").closest("button"));
    expect(onOpenCrate).toHaveBeenCalledWith(null, "e1");
    expect(onOpenCrate).not.toHaveBeenCalledWith(null, "t1");
  });
});
