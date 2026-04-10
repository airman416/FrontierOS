import { useState } from 'react'
import { ATHLETES, ATHLETE_BY_ID, getInitials } from '../data/athletes'
import { skillsForSport } from '../data/graph'
import { TECHNIQUE_SWATCH, tasksForSport } from '../data/student'
import { computeVisualRole, useFrontierStore } from '../store/useFrontierStore'
import { RoleToggle } from './RoleToggle'

const SPORT_LABEL: Record<string, string> = {
  baseball: 'Baseball',
  basketball: 'Basketball',
}

function MasteryRing({
  mastered,
  total,
  size = 96,
}: {
  mastered: number
  total: number
  size?: number
}) {
  const pct = total > 0 ? mastered / total : 0
  const deg = Math.round(pct * 360)

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `conic-gradient(#10b981 ${deg}deg, #1e2030 ${deg}deg)`,
      }}
    >
      <div
        className="flex flex-col items-center justify-center bg-[#0a0b10]"
        style={{
          width: size - 12,
          height: size - 12,
          borderRadius: '50%',
        }}
      >
        <span className="text-lg font-bold tabular-nums text-white">
          {mastered}/{total}
        </span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
          skills
        </span>
      </div>
    </div>
  )
}

export function AthleteHome() {
  const selectedAthleteId = useFrontierStore((s) => s.selectedAthleteId)
  const selectAthlete = useFrontierStore((s) => s.selectAthlete)
  const mastered = useFrontierStore((s) => s.mastered)
  const readinessScore = useFrontierStore((s) => s.readinessScore)

  const athlete = ATHLETE_BY_ID[selectedAthleteId]
  if (!athlete) return null

  const sportSkills = skillsForSport(athlete.sport)
  const masteredSkills = sportSkills.filter((s) => mastered.has(s.id))
  const masteredCount = masteredSkills.length
  const totalSkills = sportSkills.length

  const frontierSkills = sportSkills
    .filter((s) => computeVisualRole(s.id, mastered, readinessScore) === 'frontier')
    .slice(0, 3)

  const maxMasteredLevel = masteredSkills.length > 0
    ? Math.max(...masteredSkills.map((s) => s.level))
    : 0

  const tasks = tasksForSport(athlete.sport)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const toggleCheck = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-[100dvh] bg-[#0a0b10]">
      {/* Header */}
      <header className="border-b border-border-subtle bg-surface px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <select
              value={selectedAthleteId}
              onChange={(e) => selectAthlete(e.target.value)}
              className="border border-border-subtle bg-surface-raised px-2.5 py-1.5 text-xs font-semibold text-slate-300 outline-none transition hover:border-border-default"
            >
              {ATHLETES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName}
                </option>
              ))}
            </select>
            <span className="hidden text-[10px] font-bold uppercase tracking-wider text-slate-600 sm:block">
              {SPORT_LABEL[athlete.sport]}
            </span>
          </div>
          <RoleToggle />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        {/* Hero card */}
        <div className="flex flex-col items-center border border-border-subtle bg-surface-raised p-6 text-center">
          {athlete.avatarUrl ? (
            <img
              src={athlete.avatarUrl}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 border-2 border-white/10 bg-surface-elevated object-cover"
            />
          ) : (
            <span
              className="flex h-16 w-16 items-center justify-center text-xl font-bold text-white"
              style={{ backgroundColor: athlete.avatarColor }}
            >
              {getInitials(athlete.displayName)}
            </span>
          )}
          <h1 className="mt-3 text-lg font-bold text-white">{athlete.displayName}</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {athlete.position} · {athlete.schoolYear} · Age {athlete.age}
          </p>

          <div className="mt-5">
            <MasteryRing mastered={masteredCount} total={totalSkills} />
          </div>

          <p className="mt-3 text-xs font-medium text-slate-400">
            {masteredCount === totalSkills
              ? 'All skills mastered — peak performance unlocked.'
              : maxMasteredLevel > 0
                ? `Working on Level ${maxMasteredLevel + 1} skills`
                : 'Just getting started — build your foundation.'}
          </p>
        </div>

        {/* Up Next */}
        {frontierSkills.length > 0 && (
          <section className="mt-6">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Up Next
            </h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {frontierSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="border border-blue-500/20 bg-blue-500/5 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-blue-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                      Lvl {skill.level}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-white">
                    {skill.label}
                  </p>
                  {skill.prereqs.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {skill.prereqs.map((pid) => (
                        <span
                          key={pid}
                          className="border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400"
                        >
                          ✓ {pid.replace(/-/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Today's Training */}
        <section className="mt-6">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Today&apos;s Training
          </h2>
          <ul className="mt-2 space-y-1.5">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-3 border border-border-subtle bg-surface-raised p-3">
                <button
                  type="button"
                  onClick={() => toggleCheck(t.id)}
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border transition ${
                    checked.has(t.id)
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-600 bg-transparent'
                  }`}
                  aria-label={`Mark ${t.shortLabel} done`}
                >
                  {checked.has(t.id) && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0"
                      style={{ backgroundColor: TECHNIQUE_SWATCH[t.technique] }}
                    />
                    <p className={`text-sm font-semibold ${checked.has(t.id) ? 'text-slate-600 line-through' : 'text-white'}`}>
                      {t.title}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                    {t.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Recently Mastered */}
        {masteredSkills.length > 0 && (
          <section className="mt-6">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Recently Mastered
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {masteredSkills.slice(-5).reverse().map((s) => (
                <span
                  key={s.id}
                  className="border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400"
                >
                  {s.label}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
