import { describe, it, expect } from "vitest";
import {
  RESULT_DWELL_MS,
  BIG_WIN_DWELL_MS,
  dwellFor
} from "./spinDwell";

describe("dwellFor", () => {
  it("holds normal results for the short dwell", () => {
    expect(dwellFor(0, 100)).toBe(RESULT_DWELL_MS);
    expect(dwellFor(499, 100)).toBe(RESULT_DWELL_MS);
  });

  it("holds big wins (>= 5x bet) for the long dwell", () => {
    expect(dwellFor(500, 100)).toBe(BIG_WIN_DWELL_MS);
    expect(dwellFor(525, 100)).toBe(BIG_WIN_DWELL_MS);
  });

  it("scales the threshold with the bet", () => {
    expect(dwellFor(999, 200)).toBe(RESULT_DWELL_MS);
    expect(dwellFor(1000, 200)).toBe(BIG_WIN_DWELL_MS);
  });
});
