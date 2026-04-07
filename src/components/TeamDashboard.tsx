import { useState } from 'react'
import {
  ATHLETES,
  ATHLETE_BY_ID,
  getInitials,
  type Athlete,
} from '../data/athletes'
import { SKILL_DEFS } from '../data/graph'
import { computeVisualRole, useFrontierStore } from '../store/useFrontierStore'

type Tab = 'roster' | 'heatmap'

const SKILL_SHORT: Record<string, string> = {
  'sleep-hygiene': 'Sleep',
  'joint-mobility': 'Mobility',
  'aerobic-base': 'Aerobic',
  'core-stability': 'Core',
  'anaerobic-capacity': 'Anaerobic',
  'macro-tracking': 'Macros',
  'heavy-resistance': 'Resistance',
  'batting-tee-work': 'Tee Work',
  'basic-fielding': 'Fielding',
  'defensive-positioning': 'Defense',
  plyometrics: 'Plyo',
  'live-pitch-hitting': 'Live Hitting',
  'advanced-fielding': 'Adv Fielding',
  'situational-hitting': 'Sit Hitting',
  'game-day-fueling': 'Fueling',
  'peak-performance': 'Peak',
}

const ROLE_CELL_BG: Record<string, string> = {
  mastered: '#10b981',
  frontier: '#3b82f6',
  highRisk: '#f59e0b',
  locked: '#1e2030',
}

function readinessColor(score: number): string {
  if (score >= 75) return '#10b981'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function pctColor(pct: number): string {
  if (pct >= 75) return 'text-emerald-400'
  if (pct >= 50) return 'text-blue-400'
  if (pct >= 25) return 'text-amber-400'
  return 'text-slate-500'
}

/* ── Avatar ── */

function AvatarCircle({ athlete, size = 40 }: { athlete: Athlete; size?: number }) {
  if (athlete.avatarUrl) {
    return (
      <img
        src={athlete.avatarUrl}
        alt=""
        width={size}
        height={size}
        className="border-2 border-white/10 bg-surface-elevated object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center font-bold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: athlete.avatarColor,
        fontSize: size * 0.38,
      }}
    >
      {getInitials(athlete.displayName)}
    </span>
  )
}

/* ── Roster Card ── */

function RosterCard({
  athlete,
  masteredCount,
  readiness,
  onClick,
  dataTour,
}: {
  athlete: Athlete
  masteredCount: number
  readiness: number
  onClick: () => void
  dataTour?: string
}) {
  const pct = Math.round((masteredCount / SKILL_DEFS.length) * 100)

  return (
    <button
      type="button"
      onClick={onClick}
      data-tour={dataTour}
      className="group flex w-full gap-4 border border-border-subtle bg-surface-raised p-4 text-left transition hover:border-alpha/40 hover:bg-surface-elevated"
    >
      <AvatarCircle athlete={athlete} size={48} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white group-hover:text-alpha-light">
          {athlete.displayName}
        </p>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {athlete.position} · {athlete.schoolYear} · Age {athlete.age}
        </p>

        <p className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Mastery
        </p>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden bg-surface">
            <div
              className="h-full bg-emerald-500 transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] font-bold tabular-nums text-slate-400">
            {masteredCount}/{SKILL_DEFS.length}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
            Readiness
          </span>
          <span
            className="inline-block h-2 w-2"
            style={{ backgroundColor: readinessColor(readiness) }}
          />
          <span className="text-[11px] font-bold tabular-nums text-slate-400">
            {readiness}%
          </span>
        </div>
      </div>

      <span className="mt-1 shrink-0 text-xs text-slate-600 transition group-hover:text-alpha-light">
        →
      </span>
    </button>
  )
}

/* ── Roster Grid ── */

function RosterGrid({
  onSelectAthlete,
}: {
  onSelectAthlete: (id: string) => void
}) {
  const athleteMastery = useFrontierStore((s) => s.athleteMastery)
  const athleteReadiness = useFrontierStore((s) => s.athleteReadiness)

  return (
    <div data-tour="roster-grid" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ATHLETES.map((a, i) => (
        <RosterCard
          key={a.id}
          athlete={a}
          masteredCount={athleteMastery[a.id]?.size ?? 0}
          readiness={athleteReadiness[a.id] ?? 100}
          onClick={() => onSelectAthlete(a.id)}
          dataTour={i === 0 ? 'roster-card-first' : undefined}
        />
      ))}
    </div>
  )
}

/* ── Heatmap ── */

function HeatmapGrid({
  onSelectAthlete,
}: {
  onSelectAthlete: (id: string) => void
}) {
  const athleteMastery = useFrontierStore((s) => s.athleteMastery)
  const athleteReadiness = useFrontierStore((s) => s.athleteReadiness)

  const levels = [1, 2, 3, 4, 5, 6] as const
  const skillsByLevel = levels.map((l) =>
    SKILL_DEFS.filter((s) => s.level === l),
  )

  const teamMasteryBySkill = SKILL_DEFS.map((skill) => {
    const count = ATHLETES.filter((a) =>
      (athleteMastery[a.id] ?? new Set()).has(skill.id),
    ).length
    return Math.round((count / ATHLETES.length) * 100)
  })

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 bg-emerald-500" /> Mastered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 bg-blue-500" /> Ready
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 bg-amber-500" /> Paused
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3" style={{ backgroundColor: '#1e2030' }} /> Locked
        </span>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto border border-border-subtle">
        <table className="w-full border-collapse">
          {/* Column group headers (levels) */}
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-surface-raised" />
              {skillsByLevel.map((skills, li) => (
                <th
                  key={li}
                  colSpan={skills.length}
                  className="border-b border-l border-border-subtle bg-surface-raised px-1 py-1.5 text-center text-[9px] font-bold uppercase tracking-widest text-slate-600"
                >
                  Lvl {levels[li]}
                </th>
              ))}
              <th className="border-b border-l border-border-subtle bg-surface-raised px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-widest text-slate-600">
                %
              </th>
            </tr>

            {/* Skill names */}
            <tr>
              <th className="sticky left-0 z-20 min-w-[140px] border-b border-border-subtle bg-surface-raised px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Athlete
              </th>
              {SKILL_DEFS.map((s) => (
                <th
                  key={s.id}
                  className="border-b border-l border-border-subtle bg-surface-raised px-0.5 py-2 text-center"
                  title={s.label}
                >
                  <span className="block text-[9px] font-semibold leading-tight text-slate-500" style={{ writingMode: 'vertical-lr' }}>
                    {SKILL_SHORT[s.id] ?? s.label}
                  </span>
                </th>
              ))}
              <th className="border-b border-l border-border-subtle bg-surface-raised" />
            </tr>
          </thead>

          <tbody>
            {ATHLETES.map((athlete) => {
              const mastery = athleteMastery[athlete.id] ?? new Set<string>()
              const readiness = athleteReadiness[athlete.id] ?? 100
              const masteredCount = mastery.size
              const pct = Math.round(
                (masteredCount / SKILL_DEFS.length) * 100,
              )

              return (
                <tr
                  key={athlete.id}
                  className="group cursor-pointer transition hover:bg-surface-elevated/50"
                  onClick={() => onSelectAthlete(athlete.id)}
                >
                  <td className="sticky left-0 z-10 border-b border-border-subtle bg-surface-raised px-3 py-2 group-hover:bg-surface-elevated">
                    <div className="flex items-center gap-2">
                      <AvatarCircle athlete={athlete} size={24} />
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-slate-300 group-hover:text-white">
                          {athlete.firstName}
                        </p>
                        <p className="truncate text-[9px] text-slate-600">
                          {athlete.position}
                        </p>
                      </div>
                    </div>
                  </td>

                  {SKILL_DEFS.map((skill) => {
                    const role = computeVisualRole(
                      skill.id,
                      mastery,
                      readiness,
                    )
                    return (
                      <td
                        key={skill.id}
                        className="border-b border-l border-border-subtle px-0.5 py-1.5 text-center"
                        title={`${athlete.firstName}: ${skill.label} — ${role}`}
                      >
                        <span
                          className="mx-auto block h-5 w-5"
                          style={{ backgroundColor: ROLE_CELL_BG[role] }}
                        />
                      </td>
                    )
                  })}

                  <td className="border-b border-l border-border-subtle px-2 py-1.5 text-center">
                    <span
                      className={`text-[11px] font-bold tabular-nums ${pctColor(pct)}`}
                    >
                      {pct}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>

          {/* Team summary row */}
          <tfoot>
            <tr>
              <td className="sticky left-0 z-10 bg-surface px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Team %
                </span>
              </td>
              {teamMasteryBySkill.map((pct, i) => (
                <td
                  key={i}
                  className="border-l border-border-subtle bg-surface px-0.5 py-1.5 text-center"
                  title={`${SKILL_DEFS[i].label}: ${pct}% of team`}
                >
                  <span
                    className={`text-[9px] font-bold tabular-nums ${pctColor(pct)}`}
                  >
                    {pct}
                  </span>
                </td>
              ))}
              <td className="border-l border-border-subtle bg-surface" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Team gap callouts */}
      <TeamGaps
        athleteMastery={athleteMastery}
        athleteReadiness={athleteReadiness}
      />
    </div>
  )
}

/* ── Team Gap Analysis ── */

function TeamGaps({
  athleteMastery,
  athleteReadiness,
}: {
  athleteMastery: Record<string, Set<string>>
  athleteReadiness: Record<string, number>
}) {
  const gaps = SKILL_DEFS.filter((skill) => {
    const count = ATHLETES.filter((a) =>
      (athleteMastery[a.id] ?? new Set()).has(skill.id),
    ).length
    return count === 0
  })

  const avgReadiness = Math.round(
    ATHLETES.reduce((sum, a) => sum + (athleteReadiness[a.id] ?? 100), 0) /
      ATHLETES.length,
  )

  const avgMastery = Math.round(
    (ATHLETES.reduce(
      (sum, a) => sum + (athleteMastery[a.id]?.size ?? 0),
      0,
    ) /
      (ATHLETES.length * SKILL_DEFS.length)) *
      100,
  )

  const topAthlete = ATHLETES.reduce((best, a) => {
    const cur = athleteMastery[a.id]?.size ?? 0
    const bestCount = athleteMastery[best.id]?.size ?? 0
    return cur > bestCount ? a : best
  })

  const needsAttention = ATHLETES.reduce((worst, a) => {
    const cur = athleteMastery[a.id]?.size ?? 0
    const worstCount = athleteMastery[worst.id]?.size ?? 0
    return cur < worstCount ? a : worst
  })

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Team Mastery"
        value={`${avgMastery}%`}
        color={pctColor(avgMastery)}
      />
      <StatCard
        label="Avg Readiness"
        value={`${avgReadiness}%`}
        color={
          avgReadiness >= 75
            ? 'text-emerald-400'
            : avgReadiness >= 40
              ? 'text-amber-400'
              : 'text-red-400'
        }
      />
      <StatCard
        label="Most Advanced"
        value={topAthlete.firstName}
        sub={`${athleteMastery[topAthlete.id]?.size ?? 0}/${SKILL_DEFS.length} skills`}
        color="text-emerald-400"
      />
      <StatCard
        label="Needs Attention"
        value={needsAttention.firstName}
        sub={`${athleteMastery[needsAttention.id]?.size ?? 0}/${SKILL_DEFS.length} skills`}
        color="text-amber-400"
      />

      {gaps.length > 0 && (
        <div className="col-span-full border border-border-subtle bg-surface-raised p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
            Team Gaps — No one has mastered
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {gaps.map((s) => (
              <span
                key={s.id}
                className="border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-300"
              >
                {s.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub?: string
  color: string
}) {
  return (
    <div className="border border-border-subtle bg-surface-raised p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
        {label}
      </p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
    </div>
  )
}

/* ── Dashboard Shell ── */

export function TeamDashboard({
  onSelectAthlete,
  onReplayTour,
}: {
  onSelectAthlete: (id: string) => void
  onReplayTour: () => void
}) {
  const [tab, setTab] = useState<Tab>('roster')

  return (
    <div className="min-h-[100dvh] bg-[#0a0b10]">
      {/* Header */}
      <header
        data-tour="dashboard-header"
        className="border-b border-border-subtle bg-surface px-4 pb-0 pt-5 md:px-6"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-alpha-light">
                Frontier OS
              </p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight text-white md:text-2xl">
                Texas Sports Academy
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                Baseball Development · {ATHLETES.length} athletes
              </p>
            </div>
            <button
              type="button"
              onClick={onReplayTour}
              className="shrink-0 bg-alpha/15 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-alpha-light transition hover:bg-alpha/25"
            >
              Tour
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1">
            <TabBtn active={tab === 'roster'} onClick={() => setTab('roster')}>
              Roster
            </TabBtn>
            <TabBtn
              active={tab === 'heatmap'}
              onClick={() => setTab('heatmap')}
              dataTour="heatmap-tab"
            >
              Team Heatmap
            </TabBtn>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
        {tab === 'roster' ? (
          <>
            {/* Tour anchor: positions tooltip below tabs without clipping (see tour step 2) */}
            <div
              data-tour="roster-tour-anchor"
              className="mb-4 h-px w-full shrink-0 bg-border-subtle/50"
              aria-hidden
            />
            <RosterGrid onSelectAthlete={onSelectAthlete} />
          </>
        ) : (
          <HeatmapGrid onSelectAthlete={onSelectAthlete} />
        )}
      </div>
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  children,
  dataTour,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  dataTour?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tour={dataTour}
      className={`px-4 py-2 text-xs font-semibold transition ${
        active
          ? 'border-b-2 border-alpha bg-surface-raised text-white'
          : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {children}
    </button>
  )
}
