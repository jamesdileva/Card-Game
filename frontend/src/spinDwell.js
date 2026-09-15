// Auto-spin pacing (consumed by SlotMachine's finishSpin/endSpinUnlock).
//
// Spins resolve fast (~830ms to settled results), so without a pause the
// next auto-spin fires ~120ms later and nothing (count-up, floating win,
// glow, toasts) ever finishes displaying. Normal results hold for
// RESULT_DWELL_MS; wins of BIG_WIN_MULT× the bet or more hold longer so
// jackpots can be read.
export const RESULT_DWELL_MS = 800;
export const BIG_WIN_DWELL_MS = 1800;
export const BIG_WIN_MULT = 5;

export function dwellFor(payout, bet) {
  return payout >= BIG_WIN_MULT * bet ? BIG_WIN_DWELL_MS : RESULT_DWELL_MS;
}
