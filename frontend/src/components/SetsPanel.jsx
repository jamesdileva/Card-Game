import { SYNERGY_EFFECTS, synergyKey } from "./cardNames";

const SET_GROUPS = [
  { id: "pair", title: "🤝 Pair sets — two specific cards" },
  { id: "count", title: "🔢 Count sets — multiples of one card" },
  { id: "mixed", title: "🧪 Mixed sets" },
  { id: "god", title: "💀 God tier" },
  { id: "archetype", title: "🎭 Archetypes" }
];

// Reference for the deck builder: every set, what to equip, what it does.
// Sets in `activeSynergies` (backend labels, emoji-prefixed) are highlighted.
export default function SetsPanel({ activeSynergies = [] }) {
  const active = new Set((activeSynergies || []).map(synergyKey));

  return (
    <div className="bg-zinc-800 p-4 rounded-xl flex flex-col gap-4">
      {SET_GROUPS.map((group) => {
        const sets = Object.entries(SYNERGY_EFFECTS)
          .filter(([, info]) => info.group === group.id)
          .map(([name, info]) => ({ name, ...info }));
        if (sets.length === 0) return null;

        return (
          <section key={group.id}>
            <h3 className="text-sm font-bold text-zinc-200 mb-2">
              {group.title}
            </h3>
            <div className="flex flex-col gap-2">
              {sets.map((set) => {
                const isActive = active.has(set.name);
                return (
                  <div
                    key={set.name}
                    className={`rounded-lg p-2.5 text-sm transition
                      ${isActive
                        ? "bg-purple-900/40 ring-1 ring-purple-400"
                        : "bg-zinc-900/60"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-purple-200">
                        {set.name}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500 text-white">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-zinc-400 text-xs mt-0.5">
                      Equip: {set.req}
                    </div>
                    <div className="text-zinc-200 text-xs">
                      Effect: {set.fx}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
