import { useMemo, useState } from 'react'
import {
  getInitials,
  type Athlete,
} from '../data/athletes'
import { SPORT_OPTIONS } from '../data/graph'
import { computeVisualRole, useFrontierStore } from '../store/useFrontierStore'
import { RoleToggle } from './RoleToggle'

type Tab = 'roster' | 'heatmap'

function getSportLabel(sport: string): string {
  return sport.charAt(0).toUpperCase() + sport.slice(1)
}

const ROLE_CELL_BG: Record<string, string> = {
  mastered: '#10b981',
  frontier: '#3b82f6',
  highRisk: '#f59e0b',
  locked: '#1e2030',
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

type OnboardingState = 'locked' | 'awaiting' | 'onboarded'

interface RosterCardProps {
  athlete: Athlete
  state: OnboardingState
  mastered: number
  totalSkills: number
  aiReonboarded: boolean
  onOnboard: () => void
  onOpenDetail: () => void
  dataTour?: string
}

function RosterCard({
  athlete,
  state,
  mastered,
  totalSkills,
  aiReonboarded,
  onOnboard,
  onOpenDetail,
  dataTour,
}: RosterCardProps) {
  const pct = totalSkills > 0 ? Math.round((mastered / totalSkills) * 100) : 0

  if (state === 'locked') {
    return (
      <div
        data-tour={dataTour}
        className="flex w-full gap-4 border border-border-subtle bg-surface-raised p-4 text-left opacity-70"
      >
        <AvatarCircle athlete={athlete} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{athlete.displayName}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {athlete.position} · {athlete.schoolYear} · Age {athlete.age}
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            <span className="inline-block h-2 w-2 bg-slate-600" />
            Awaiting team plan
          </p>
        </div>
      </div>
    )
  }

  if (state === 'awaiting') {
    return (
      <div
        data-tour={dataTour}
        className="flex w-full flex-col gap-3 border border-alpha/30 bg-gradient-to-br from-alpha/10 to-transparent p-4 text-left"
      >
        <div className="flex gap-3">
          <AvatarCircle athlete={athlete} size={48} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{athlete.displayName}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {athlete.position} · {athlete.schoolYear} · Age {athlete.age}
            </p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-alpha-light">
              Step 2 · Onboard to place on graph
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOnboard}
          className="mt-1 w-full bg-alpha py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-alpha-light"
        >
          Onboard student →
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpenDetail}
      data-tour={dataTour}
      className="group flex w-full gap-4 border border-border-subtle bg-surface-raised p-4 text-left transition hover:border-alpha/40 hover:bg-surface-elevated"
    >
      <div className="relative shrink-0">
        <AvatarCircle athlete={athlete} size={48} />
        <span
          className="absolute -bottom-1 -right-1 border border-border-subtle bg-surface-elevated px-1 py-0.5 text-[9px] font-bold tabular-nums text-emerald-400"
          title={`${mastered} of ${totalSkills} skills mastered`}
        >
          {pct}%
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-bold text-white group-hover:text-alpha-light">
            {athlete.displayName}
          </p>
          {aiReonboarded && (
            <span className="shrink-0 border border-amber-500/30 bg-amber-500/10 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-300">
              AI
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {athlete.position} · {athlete.schoolYear} · Age {athlete.age}
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
          <span className="inline-block h-2 w-2 bg-emerald-500" />
          {mastered}/{totalSkills} skills — View →
        </p>
      </div>
    </button>
  )
}

/* ── Roster Grid ── */

function RosterGrid({
  sport,
  onOnboardAthlete,
  onOpenDetail,
}: {
  sport: string
  onOnboardAthlete: (id: string) => void
  onOpenDetail: (id: string) => void
}) {
  const getAthletesForSport = useFrontierStore((s) => s.getAthletesForSport)
  const athleteGraphs = useFrontierStore((s) => s.athleteGraphs)
  const athleteDiagnostic = useFrontierStore((s) => s.athleteDiagnostic)
  const athleteMastery = useFrontierStore((s) => s.athleteMastery)
  const athleteReonboardStatus = useFrontierStore((s) => s.athleteReonboardStatus)
  const sportPlans = useFrontierStore((s) => s.sportPlans)
  const getResolvedAthleteGraph = useFrontierStore((s) => s.getResolvedAthleteGraph)
  const filtered = getAthletesForSport(sport)
  const hasSportPlan = !!sportPlans[sport]

  return (
    <div data-tour="roster-grid" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {filtered.map((a, i) => {
        const legacy = athleteGraphs[a.id]
        const hasAnyPlan = hasSportPlan || !!legacy
        const diagnostic = athleteDiagnostic[a.id]
        const reonboard = athleteReonboardStatus[a.id]
        const state: OnboardingState = !hasAnyPlan
          ? 'locked'
          : diagnostic
            ? 'onboarded'
            : 'awaiting'
        const resolved = getResolvedAthleteGraph(a.id)
        const total = resolved?.skills?.length ?? 0
        const mastered = (athleteMastery[a.id] ?? new Set<string>()).size
        return (
          <RosterCard
            key={a.id}
            athlete={a}
            state={state}
            mastered={mastered}
            totalSkills={total}
            aiReonboarded={!!reonboard?.aiReonboarded && !reonboard.confirmed}
            onOnboard={() => onOnboardAthlete(a.id)}
            onOpenDetail={() => onOpenDetail(a.id)}
            dataTour={i === 0 ? 'roster-card-first' : undefined}
          />
        )
      })}
    </div>
  )
}

/* ── Heatmap ── */

function HeatmapGrid({
  sport,
  onSelectAthlete,
}: {
  sport: string
  onSelectAthlete: (id: string) => void
}) {
  const athleteMastery = useFrontierStore((s) => s.athleteMastery)
  const athleteReadiness = useFrontierStore((s) => s.athleteReadiness)
  const skillById = useFrontierStore((s) => s.skillById)
  const sportData = useFrontierStore((s) => s.sportData)
  const getAthletesForSport = useFrontierStore((s) => s.getAthletesForSport)
  const getSkillsForSport = useFrontierStore((s) => s.getSkillsForSport)

  const sportSkills = getSkillsForSport(sport)
  const filtered = getAthletesForSport(sport)

  const levels = [1, 2, 3, 4, 5, 6] as const
  const skillsByLevel = levels.map((l) =>
    sportSkills.filter((s) => s.level === l),
  ).filter((arr) => arr.length > 0)
  const usedLevels = skillsByLevel.map((arr) => arr[0].level)

  const teamMasteryBySkill = sportSkills.map((skill) => {
    const count = filtered.filter((a) =>
      (athleteMastery[a.id] ?? new Set()).has(skill.id),
    ).length
    return filtered.length > 0 ? Math.round((count / filtered.length) * 100) : 0
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
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-surface-raised" />
              {skillsByLevel.map((skills, li) => (
                <th
                  key={li}
                  colSpan={skills.length}
                  className="border-b border-l border-border-subtle bg-surface-raised px-1 py-1.5 text-center text-[9px] font-bold uppercase tracking-widest text-slate-600"
                >
                  Lvl {usedLevels[li]}
                </th>
              ))}
              <th className="border-b border-l border-border-subtle bg-surface-raised px-2 py-1.5 text-center text-[9px] font-bold uppercase tracking-widest text-slate-600">
                %
              </th>
            </tr>

            <tr>
              <th className="sticky left-0 z-20 min-w-[140px] border-b border-border-subtle bg-surface-raised px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Athlete
              </th>
              {sportSkills.map((s) => (
                <th
                  key={s.id}
                  className="border-b border-l border-border-subtle bg-surface-raised px-0.5 py-2 text-center"
                  title={s.label}
                >
                  <span className="block text-[9px] font-semibold leading-tight text-slate-500" style={{ writingMode: 'vertical-lr' }}>
                    {sportData.skillShortLabels[s.id] ?? s.label}
                  </span>
                </th>
              ))}
              <th className="border-b border-l border-border-subtle bg-surface-raised" />
            </tr>
          </thead>

          <tbody>
            {filtered.map((athlete) => {
              const mastery = athleteMastery[athlete.id] ?? new Set<string>()
              const readiness = athleteReadiness[athlete.id] ?? 100
              const sportMastered = sportSkills.filter((s) => mastery.has(s.id)).length
              const pct = sportSkills.length > 0
                ? Math.round((sportMastered / sportSkills.length) * 100)
                : 0

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

                  {sportSkills.map((skill) => {
                    const role = computeVisualRole(
                      skill.id,
                      mastery,
                      readiness,
                      skillById,
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
                  title={`${sportSkills[i].label}: ${pct}% of team`}
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

      <TeamGaps sport={sport} />
    </div>
  )
}

/* ── Team Gap Analysis ── */

function TeamGaps({ sport }: { sport: string }) {
  const athleteMastery = useFrontierStore((s) => s.athleteMastery)
  const athleteReadiness = useFrontierStore((s) => s.athleteReadiness)
  const getAthletesForSport = useFrontierStore((s) => s.getAthletesForSport)
  const getSkillsForSport = useFrontierStore((s) => s.getSkillsForSport)

  const sportSkills = getSkillsForSport(sport)
  const filtered = getAthletesForSport(sport)

  const gaps = sportSkills.filter((skill) => {
    const count = filtered.filter((a) =>
      (athleteMastery[a.id] ?? new Set()).has(skill.id),
    ).length
    return count === 0
  })

  const avgReadiness = filtered.length > 0
    ? Math.round(
        filtered.reduce((sum, a) => sum + (athleteReadiness[a.id] ?? 100), 0) /
          filtered.length,
      )
    : 0

  const avgMastery = filtered.length > 0 && sportSkills.length > 0
    ? Math.round(
        (filtered.reduce(
          (sum, a) => sum + sportSkills.filter((s) => (athleteMastery[a.id] ?? new Set()).has(s.id)).length,
          0,
        ) /
          (filtered.length * sportSkills.length)) *
          100,
      )
    : 0

  const topAthlete = filtered.length > 0
    ? filtered.reduce((best, a) => {
        const cur = sportSkills.filter((s) => (athleteMastery[a.id] ?? new Set()).has(s.id)).length
        const bestCount = sportSkills.filter((s) => (athleteMastery[best.id] ?? new Set()).has(s.id)).length
        return cur > bestCount ? a : best
      })
    : null

  const needsAttention = filtered.length > 0
    ? filtered.reduce((worst, a) => {
        const cur = sportSkills.filter((s) => (athleteMastery[a.id] ?? new Set()).has(s.id)).length
        const worstCount = sportSkills.filter((s) => (athleteMastery[worst.id] ?? new Set()).has(s.id)).length
        return cur < worstCount ? a : worst
      })
    : null

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
      {topAthlete && (
        <StatCard
          label="Most Advanced"
          value={topAthlete.firstName}
          sub={`${sportSkills.filter((s) => (athleteMastery[topAthlete.id] ?? new Set()).has(s.id)).length}/${sportSkills.length} skills`}
          color="text-emerald-400"
        />
      )}
      {needsAttention && (
        <StatCard
          label="Needs Attention"
          value={needsAttention.firstName}
          sub={`${sportSkills.filter((s) => (athleteMastery[needsAttention.id] ?? new Set()).has(s.id)).length}/${sportSkills.length} skills`}
          color="text-amber-400"
        />
      )}

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

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const sec = Math.round(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.round(hr / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  return `${months}mo ago`
}

export function TeamDashboard({
  onOnboardAthlete,
  onOpenDetail,
  onSelectAthlete,
  onGenerateTeamPlan,
  onReplayTour,
}: {
  onOnboardAthlete: (id: string) => void
  onOpenDetail: (id: string) => void
  /** Heatmap still jumps into BuilderView on athlete click. */
  onSelectAthlete: (id: string) => void
  onGenerateTeamPlan: (sport: string) => void
  onReplayTour: () => void
}) {
  const [tab, setTab] = useState<Tab>('roster')
  const selectedSport = useFrontierStore((s) => s.selectedSport)
  const setSelectedSport = useFrontierStore((s) => s.setSelectedSport)
  const getAthletesForSport = useFrontierStore((s) => s.getAthletesForSport)
  const sportPlans = useFrontierStore((s) => s.sportPlans)
  const athleteDiagnostic = useFrontierStore((s) => s.athleteDiagnostic)
  const athletesOnSport = getAthletesForSport(selectedSport)
  const filteredCount = athletesOnSport.length
  const currentSportPlan = useMemo(
    () => sportPlans[selectedSport] ?? null,
    [sportPlans, selectedSport],
  )
  const unOnboardedAthletes = useMemo(
    () => (currentSportPlan ? athletesOnSport.filter((a) => !athleteDiagnostic[a.id]) : []),
    [athletesOnSport, currentSportPlan, athleteDiagnostic],
  )
  const firstUnOnboardedId = unOnboardedAthletes[0]?.id ?? null

  return (
    <div className="min-h-[100dvh] bg-[#0a0b10]">
      {/* Header */}
      <header
        data-tour="dashboard-header"
        className="border-b border-border-subtle bg-surface px-4 pb-0 pt-5 md:px-6"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-alpha-light">
                Frontier OS
              </p>
              <h1 className="mt-0.5 text-xl font-bold tracking-tight text-white md:text-2xl">
                Texas Sports Academy
              </h1>
              <p className="mt-1 text-xs text-slate-500">
                {getSportLabel(selectedSport)} · {filteredCount} athletes
                {currentSportPlan && (
                  <span className="ml-2 text-slate-600">
                    · Team plan updated {formatRelativeTime(currentSportPlan.updatedAt)}
                  </span>
                )}
                {unOnboardedAthletes.length > 0 && firstUnOnboardedId && (
                  <button
                    type="button"
                    onClick={() => onOnboardAthlete(firstUnOnboardedId)}
                    className="ml-2 border border-alpha/40 bg-alpha/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-alpha-light transition hover:bg-alpha/20"
                  >
                    {unOnboardedAthletes.length} un-onboarded · Start →
                  </button>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => onGenerateTeamPlan(selectedSport)}
                data-tour="team-plan-cta"
                className={`group relative flex shrink-0 items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition ${
                  currentSportPlan
                    ? 'bg-alpha shadow-alpha/20 hover:bg-alpha-light'
                    : 'bg-alpha shadow-alpha/40 hover:bg-alpha-light ring-2 ring-alpha/60 ring-offset-2 ring-offset-surface'
                }`}
                title={
                  currentSportPlan
                    ? `Edit the ${getSportLabel(selectedSport)} team plan`
                    : `Generate a team-wide plan for ${getSportLabel(selectedSport)}`
                }
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden
                  className="shrink-0"
                >
                  <path
                    d="M7 1.5v11M1.5 7h11"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span>
                  {currentSportPlan ? 'Edit Team Plan' : 'Generate Team Plan'}
                </span>
              </button>
              <button
                type="button"
                onClick={onReplayTour}
                className="shrink-0 bg-alpha/15 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-alpha-light transition hover:bg-alpha/25"
              >
                Tour
              </button>
              <RoleToggle />
            </div>
          </div>

          {/* Sport filter + view tabs */}
          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="flex gap-1">
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
            <select
              value={selectedSport}
              onChange={(e) => setSelectedSport(e.target.value)}
              className="mb-px border border-border-subtle bg-surface-elevated px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white outline-none transition hover:border-border-default focus:border-alpha"
            >
              {SPORT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {getSportLabel(s)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
        {!currentSportPlan && (
          <div className="mb-5 flex flex-col items-start gap-3 border border-alpha/40 bg-gradient-to-r from-alpha/15 via-alpha/10 to-transparent p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-alpha-light">
                Start here
              </p>
              <p className="mt-1 text-base font-bold text-white">
                Generate your {getSportLabel(selectedSport)} team plan
              </p>
              <p className="mt-1 text-xs text-slate-400">
                One plan that seeds every {getSportLabel(selectedSport).toLowerCase()} athlete. You can fine-tune per athlete afterward by clicking their card.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onGenerateTeamPlan(selectedSport)}
              className="shrink-0 bg-alpha px-5 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-alpha/30 transition hover:bg-alpha-light"
            >
              Generate Team Plan →
            </button>
          </div>
        )}

        {tab === 'roster' ? (
          <>
            <div
              data-tour="roster-tour-anchor"
              className="mb-4 h-px w-full shrink-0 bg-border-subtle/50"
              aria-hidden
            />
            <RosterGrid
              sport={selectedSport}
              onOnboardAthlete={onOnboardAthlete}
              onOpenDetail={onOpenDetail}
            />
          </>
        ) : (
          <HeatmapGrid sport={selectedSport} onSelectAthlete={onSelectAthlete} />
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
