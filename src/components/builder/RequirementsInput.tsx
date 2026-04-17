export function RequirementsInput({
  value,
  onChange,
  label = 'Requirements & Preferences',
  placeholder = 'e.g., I care about elbow reinforcement, I want all athletes on carnivore diets, focus on defensive fundamentals...',
}: {
  value: string
  onChange: (val: string) => void
  label?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder={placeholder}
        className="mt-1.5 w-full resize-none border border-border-subtle bg-surface-elevated px-3 py-2.5 text-sm leading-relaxed text-white placeholder-slate-600 outline-none transition focus:border-alpha"
      />
    </div>
  )
}
