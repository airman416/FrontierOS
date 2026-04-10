import { useFrontierStore } from '../store/useFrontierStore'

export function RoleToggle() {
  const userRole = useFrontierStore((s) => s.userRole)
  const setUserRole = useFrontierStore((s) => s.setUserRole)

  return (
    <div data-tour="role-toggle" className="flex border border-border-subtle">
      <button
        type="button"
        onClick={() => setUserRole('coach')}
        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
          userRole === 'coach'
            ? 'bg-alpha text-white'
            : 'bg-surface-raised text-slate-500 hover:text-slate-300'
        }`}
      >
        Coach
      </button>
      <button
        type="button"
        onClick={() => setUserRole('athlete')}
        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
          userRole === 'athlete'
            ? 'bg-alpha text-white'
            : 'bg-surface-raised text-slate-500 hover:text-slate-300'
        }`}
      >
        Athlete
      </button>
    </div>
  )
}
