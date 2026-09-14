import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useCountUp from "./useCountUp";

// Manual rAF stub: frames only advance when we flush them, making the
// animation deterministic without relying on fake-timer rAF support.
let frameQueue;
let frameNow;

beforeEach(() => {
  frameQueue = [];
  frameNow = 1000;
  vi.stubGlobal("requestAnimationFrame", (cb) => {
    frameQueue.push(cb);
    return frameQueue.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("performance", { now: () => frameNow });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function flushFrame(msLater) {
  frameNow += msLater;
  const pending = frameQueue;
  frameQueue = [];
  act(() => {
    pending.forEach((cb) => cb(frameNow));
  });
}

describe("useCountUp", () => {
  it("starts at the initial target with no animation", () => {
    const { result } = renderHook(() => useCountUp(500));

    expect(result.current).toBe(500);
    expect(frameQueue).toHaveLength(0);
  });

  it("animates ease-out toward a new target and lands exactly on it", () => {
    const { result, rerender } = renderHook(({ target }) => useCountUp(target), {
      initialProps: { target: 0 }
    });

    rerender({ target: 1000 });
    expect(frameQueue.length).toBe(1);

    // midway through the 500ms default duration
    flushFrame(250);
    const midway = result.current;
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(1000);
    // ease-out covers more than half the distance by the midpoint
    expect(midway).toBeGreaterThan(500);

    // past the end of the duration → exact final value
    flushFrame(300);
    expect(result.current).toBe(1000);
    expect(frameQueue).toHaveLength(0); // animation stopped itself
  });

  it("resumes from the displayed value if interrupted mid-animation", () => {
    const { result, rerender } = renderHook(({ target }) => useCountUp(target), {
      initialProps: { target: 0 }
    });

    rerender({ target: 1000 });
    flushFrame(250);
    const shown = result.current;

    // retarget before finishing
    rerender({ target: 2000 });
    flushFrame(0);

    // next frame moves from where it was — never snaps back to 0
    flushFrame(50);
    expect(result.current).toBeGreaterThanOrEqual(shown);
    expect(result.current).toBeLessThan(2000);

    flushFrame(600);
    expect(result.current).toBe(2000);
  });

  it("does nothing when the target does not change", () => {
    const { rerender } = renderHook(({ target }) => useCountUp(target), {
      initialProps: { target: 42 }
    });

    rerender({ target: 42 });

    expect(frameQueue).toHaveLength(0);
  });
});
