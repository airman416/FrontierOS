const SPORT_CHIPS = ['Baseball', 'Basketball', 'Soccer', 'Swimming', 'Tennis', 'Wrestling', 'Volleyball']

export function SportPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (sport: string) => void
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
        Sport
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g., Soccer, Lacrosse, Track & Field..."
        className="mt-1.5 w-full border border-border-subtle bg-surface-elevated px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-alpha"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SPORT_CHIPS.map((sport) => (
          <button
            key={sport}
            type="button"
            onClick={() => onChange(sport.toLowerCase())}
            className={`border px-2.5 py-1 text-[11px] font-semibold transition ${
              value.toLowerCase() === sport.toLowerCase()
                ? 'border-alpha bg-alpha/15 text-alpha-light'
                : 'border-border-subtle bg-surface-elevated text-slate-400 hover:border-border-default hover:text-slate-300'
            }`}
          >
            {sport}
          </button>
        ))}
      </div>
    </div>
  )
}
