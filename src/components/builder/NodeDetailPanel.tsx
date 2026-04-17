import { useMemo } from 'react'
import type { SkillDef } from '../../data/graph'

const LEVEL_LABEL: Record<number, string> = {
  1: 'Foundation',
  2: 'Foundation',
  3: 'Development',
  4: 'Development',
  5: 'Integration',
  6: 'Integration',
}

const LEVEL_COLOR: Record<number, string> = {
  1: 'bg-slate-500',
  2: 'bg-slate-500',
  3: 'bg-blue-500',
  4: 'bg-blue-500',
  5: 'bg-violet-500',
  6: 'bg-emerald-500',
}

const LEVEL_TEXT_COLOR: Record<number, string> = {
  1: 'text-slate-400',
  2: 'text-slate-400',
  3: 'text-blue-400',
  4: 'text-blue-400',
  5: 'text-violet-400',
  6: 'text-emerald-400',
}

export function NodeDetailPanel({
  skill,
  allSkills,
  onClose,
}: {
  skill: SkillDef
  allSkills: SkillDef[]
  onClose: () => void
}) {
  const skillById = useMemo(
    () => Object.fromEntries(allSkills.map((s) => [s.id, s])),
    [allSkills],
  )

  const prereqSkills = useMemo(
    () => skill.prereqs.map((id) => skillById[id]).filter(Boolean),
    [skill.prereqs, skillById],
  )

  const dependents = useMemo(
    () => allSkills.filter((s) => s.prereqs.includes(skill.id)),
    [allSkills, skill.id],
  )

  const levelDots = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-2 ${i < skill.level ? LEVEL_COLOR[skill.level] ?? 'bg-slate-500' : 'bg-slate-700/50'}`}
          aria-hidden
        />
      )),
    [skill.level],
  )

  return (
    <div className="flex h-full w-[300px] shrink-0 flex-col border-l border-border-subtle bg-surface-raised">
      <div className="flex items-start justify-between gap-2 border-b border-border-subtle px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Node Details
          </p>
          <h3 className="mt-0.5 text-sm font-bold leading-snug text-white">
            {skill.label}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-1 text-slate-500 transition hover:text-white"
          aria-label="Close details"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-5">
          {skill.summary && (
            <section>
              <SectionLabel>Summary</SectionLabel>
              <p className="mt-1.5 text-[12px] leading-relaxed text-slate-300">
                {skill.summary}
              </p>
            </section>
          )}

          <section>
            <SectionLabel>Level</SectionLabel>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex gap-0.5">{levelDots}</div>
              <span className={`text-xs font-semibold ${LEVEL_TEXT_COLOR[skill.level] ?? 'text-slate-400'}`}>
                {skill.level} — {LEVEL_LABEL[skill.level] ?? 'Advanced'}
              </span>
            </div>
          </section>

          <section>
            <SectionLabel>Sport</SectionLabel>
            <p className="mt-1 text-xs capitalize text-slate-300">
              {skill.sport}
            </p>
          </section>

          <section>
            <SectionLabel>ID</SectionLabel>
            <p className="mt-1 font-mono text-[11px] text-slate-500">
              {skill.id}
            </p>
          </section>

          <section>
            <SectionLabel>
              Prerequisites
              <Count>{prereqSkills.length}</Count>
            </SectionLabel>
            {prereqSkills.length === 0 ? (
              <p className="mt-1.5 text-[11px] italic text-slate-600">
                No prerequisites — root node
              </p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {prereqSkills.map((p) => (
                  <SkillChip key={p.id} skill={p} />
                ))}
              </ul>
            )}
          </section>

          <section>
            <SectionLabel>
              Unlocks
              <Count>{dependents.length}</Count>
            </SectionLabel>
            {dependents.length === 0 ? (
              <p className="mt-1.5 text-[11px] italic text-slate-600">
                Terminal node — no dependents
              </p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {dependents.map((d) => (
                  <SkillChip key={d.id} skill={d} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
      {children}
    </p>
  )
}

function Count({ children }: { children: number }) {
  return (
    <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center bg-surface-elevated px-1 text-[10px] font-semibold tabular-nums text-slate-400">
      {children}
    </span>
  )
}

function SkillChip({ skill }: { skill: SkillDef }) {
  return (
    <li className="flex items-center gap-2 border border-border-subtle bg-surface-elevated px-2.5 py-1.5">
      <span
        className={`h-1.5 w-1.5 shrink-0 ${LEVEL_COLOR[skill.level] ?? 'bg-slate-600'}`}
        aria-hidden
      />
      <span className="min-w-0 truncate text-[11px] font-medium text-slate-300">
        {skill.label}
      </span>
      <span className="ml-auto shrink-0 text-[10px] text-slate-600">
        L{skill.level}
      </span>
    </li>
  )
}
