export default function HudBar({ balance, xp, level, loginStreak, onLogout }) {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur border-b border-zinc-800">
      <div className="max-w-5xl mx-auto px-4 py-2 flex items-center gap-4">
        <div className="text-lg font-bold whitespace-nowrap" data-testid="balance">
          💰 ${balance.toLocaleString()}
        </div>

        <div className="flex-1 min-w-[140px] max-w-xs">
          <div className="flex justify-between text-[10px] text-zinc-400 leading-none mb-1">
            <span>LVL {level}</span>
            <span>
              {xp} / {level * 100} XP
            </span>
          </div>
          <div className="w-full bg-zinc-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-green-500 h-full transition-all duration-500"
              style={{
                width: `${Math.min((xp / (level * 100)) * 100, 100)}%`
              }}
            />
          </div>
        </div>

        <div className="text-xs text-blue-400 whitespace-nowrap hidden sm:block">
          📅 {loginStreak}
        </div>

        <button
          onClick={onLogout}
          className="text-xs bg-red-500/90 hover:bg-red-600 px-3 py-1 rounded-lg ml-auto"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
