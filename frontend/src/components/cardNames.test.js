import { describe, it, expect } from "vitest";
import {
  cardName,
  rarityBorder,
  rarityText,
  nextRarity,
  MERGE_COST,
  synergyTooltip,
  synergyKey,
  SYNERGY_EFFECTS,
  STAT_TOOLTIPS
} from "./cardNames";

describe("cardName", () => {
  it("maps known ids to display names", () => {
    expect(cardName("mythic_multiplier")).toBe("Mythic Multiplier");
    expect(cardName("safety_net")).toBe("Safety Net");
    expect(cardName("jackpot_surge")).toBe("Jackpot Surge");
  });

  it("title-cases unknown ids as fallback", () => {
    expect(cardName("future_card")).toBe("Future Card");
  });
});

describe("rarity classes", () => {
  it("returns tier-specific border and text classes", () => {
    expect(rarityBorder("legendary")).toContain("yellow");
    expect(rarityText("epic")).toContain("purple");
    expect(rarityText("rare")).toContain("blue");
  });

  it("falls back to zinc for common/unknown", () => {
    expect(rarityBorder("common")).toBe("border-zinc-600");
    expect(rarityText("nonsense")).toBe("text-zinc-400");
  });
});

describe("nextRarity", () => {
  it("climbs the evolution ladder", () => {
    expect(nextRarity("common")).toBe("rare");
    expect(nextRarity("rare")).toBe("epic");
    expect(nextRarity("epic")).toBe("legendary");
  });

  it("is terminal at legendary and rejects unknown tiers", () => {
    expect(nextRarity("legendary")).toBeNull();
    expect(nextRarity("nope")).toBeNull();
  });

  it("merge cost matches the backend rule of 3 duplicates", () => {
    expect(MERGE_COST).toBe(3);
  });
});

describe("synergyTooltip", () => {
  it("joins each active set on its own line with reqs and effects", () => {
    const text = synergyTooltip(["🍀 Lucky Jackpot", "💥 Mythic Double"]);
    const lines = text.split("\n");

    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Lucky Jackpot");
    expect(lines[0]).toContain("Lucky Charm + Jackpot Boost");
    expect(lines[0]).toContain("payout ×1.5");
    expect(lines[1]).toContain("Mythic Double");
    expect(lines[1]).toContain("payout ×2");
  });

  it("trims the backend's stray leading space (Triple Mythic)", () => {
    const text = synergyTooltip([" Triple Mythic"]);
    expect(text).toContain("Triple Mythic");
    expect(text).toContain("payout +7x");
  });

  it("passes through unknown labels instead of dropping them", () => {
    expect(synergyTooltip(["🆕 Mystery Set"])).toBe("🆕 Mystery Set");
  });

  it("handles empty/missing synergy lists", () => {
    expect(synergyTooltip([])).toBe("");
    expect(synergyTooltip(undefined)).toBe("");
  });

  it("documents every synergy the backend can emit", () => {
    // Mirrors addSynergy calls in backend/game/effects.js
    const backendLabels = [
      "🍀 Lucky Jackpot",
      "🔁 Chain Reroll",
      "💥 Mythic Double",
      "Triple Mythic",
      "🍀 Lucky Pair",
      "🔁 Reroll Engine",
      "✨ Luck Engine",
      "⛓️ Chain Scaling",
      "🃏 Wild Surge",
      "👑 Jackpot Overload",
      "💀 GOD BUILD",
      "🛡️ Safety Inspector",
      "🔥 Surge Rider",
      "💰 Vault Buster",
      "🌪️ Chaos Engine",
      "🧯 Steady Burn"
    ];

    const text = synergyTooltip(backendLabels);
    backendLabels.forEach((label) => {
      expect(text).toContain(label.trim());
    });
    // Unknown-label passthrough would leave these bare — every line has a
    // description separator, so nothing fell through.
    expect(text.split("\n")).toHaveLength(backendLabels.length);
    text.split("\n").forEach((line) => expect(line).toContain("·"));
  });
});

describe("SYNERGY_EFFECTS (Sets tab source)", () => {
  const GROUPS = ["pair", "count", "mixed", "god", "archetype"];

  it("covers every synergy the backend can emit", () => {
    expect(Object.keys(SYNERGY_EFFECTS)).toHaveLength(16);
  });

  it("fills req, fx, and group on every entry", () => {
    Object.entries(SYNERGY_EFFECTS).forEach(([name, info]) => {
      expect(info.req, `${name} req`).toBeTruthy();
      expect(info.fx, `${name} fx`).toBeTruthy();
      expect(GROUPS, `${name} group`).toContain(info.group);
    });
  });

  it("normalizes backend labels to map keys", () => {
    expect(synergyKey("🍀 Lucky Jackpot")).toBe("Lucky Jackpot");
    expect(synergyKey(" Triple Mythic")).toBe("Triple Mythic");
    expect(SYNERGY_EFFECTS[synergyKey("🛡️ Safety Inspector")].req).toContain(
      "Safety Net"
    );
  });
});

describe("STAT_TOOLTIPS", () => {
  it("explains all four stat tiles", () => {
    expect(Object.keys(STAT_TOOLTIPS).sort()).toEqual([
      "boost",
      "deck",
      "luck",
      "xp"
    ]);
    Object.values(STAT_TOOLTIPS).forEach((tip) =>
      expect(tip.length).toBeGreaterThan(10)
    );
  });
});
