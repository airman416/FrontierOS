import { useMemo, useState } from 'react'
import { ATHLETES, ATHLETE_BY_ID, getInitials } from '../data/athletes'
import { skillsForSport, type SkillDef } from '../data/graph'
import type { TodayTask } from '../data/student'
import {
  buildPostreqClosure,
  buildPrereqClosure,
  dueSkills,
  importance,
  reviewsKnockedOut,
} from '../lib/fire'
import { useFrontierStore } from '../store/useFrontierStore'
import { RoleToggle } from './RoleToggle'

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
  const getResolvedAthleteGraph = useFrontierStore((s) => s.getResolvedAthleteGraph)
  const getDashboardTasks = useFrontierStore((s) => s.getDashboardTasks)
  const getAthleteDiagnostic = useFrontierStore((s) => s.getAthleteDiagnostic)
  const skillProgress = useFrontierStore((s) => s.athleteSkillProgress[selectedAthleteId])
  const completeTask = useFrontierStore((s) => s.completeTask)
  const uncompleteTask = useFrontierStore((s) => s.uncompleteTask)
  const clearCompletedTasks = useFrontierStore((s) => s.clearCompletedTasks)
  const completedTaskIds = useFrontierStore(
    (s) => s.athleteCompletedTasks[selectedAthleteId],
  )
  const reviewState = useFrontierStore((s) => s.athleteReviewState[selectedAthleteId])
  const dashboardEpoch = useFrontierStore(
    (s) => s.athleteDashboard[selectedAthleteId]?.updatedAt ?? 0,
  )

  const athlete = ATHLETE_BY_ID[selectedAthleteId]
  const resolvedGraph = useMemo(
    () => getResolvedAthleteGraph(selectedAthleteId),
    [getResolvedAthleteGraph, selectedAthleteId],
  )

  const sportSkills: SkillDef[] = useMemo(() => {
    if (resolvedGraph?.skills && resolvedGraph.skills.length > 0) {
      return resolvedGraph.skills
    }
    if (!athlete) return []
    return skillsForSport(athlete.sport)
  }, [resolvedGraph, athlete])

  const skillById = useMemo(
    () => Object.fromEntries(sportSkills.map((s) => [s.id, s])),
    [sportSkills],
  )
  const prereqClosure = useMemo(() => buildPrereqClosure(sportSkills), [sportSkills])
  const postreqClosure = useMemo(() => buildPostreqClosure(sportSkills), [sportSkills])

  const diagnostic = getAthleteDiagnostic(selectedAthleteId)
  const supportsAdaptive = sportSkills.some((s) => !!s.diagnosticPrompt)

  const skillProgressMap = skillProgress ?? {}

  const dashboardTasks = useMemo(
    () => (diagnostic ? getDashboardTasks(selectedAthleteId) : []),
    [diagnostic, getDashboardTasks, selectedAthleteId, mastered, dashboardEpoch],
  )

  const [justCompleted, setJustCompleted] = useState<Set<string>>(new Set())

  const completedSet = completedTaskIds ?? new Set<string>()

  // Render active rows first, then completed rows beneath them so the checked
  // items collect at the bottom of the list (without disappearing).
  const sortedDashboardTasks = useMemo(() => {
    if (completedSet.size === 0) return dashboardTasks
    const active: TodayTask[] = []
    const done: TodayTask[] = []
    for (const t of dashboardTasks) {
      if (completedSet.has(t.id)) done.push(t)
      else active.push(t)
    }
    return [...active, ...done]
  }, [dashboardTasks, completedSet])
  const completedVisibleCount = sortedDashboardTasks.filter((t) => completedSet.has(t.id)).length

  if (!athlete) return null

  const masteredSkills = sportSkills.filter((s) => mastered.has(s.id))
  const masteredCount = masteredSkills.length
  const totalSkills = sportSkills.length

  const frontierSkills = sportSkills.filter(
    (s) => !mastered.has(s.id) && s.prereqs.every((p) => mastered.has(p)),
  )

  const now = Date.now()
  const due = dueSkills(mastered, reviewState ?? {}, now)

  const topImportance = dashboardTasks.reduce((max, t) => {
    const imp = importance({
      task: t,
      prereqClosure,
      postreqClosure,
      due,
    })
    return Math.max(max, imp)
  }, 0)

  const handleToggle = (taskId: string) => {
    if (completedSet.has(taskId)) {
      uncompleteTask(selectedAthleteId, taskId)
      return
    }
    setJustCompleted((prev) => {
      const next = new Set(prev)
      next.add(taskId)
      return next
    })
    // Small delay so the checkmark animation is visible before the row settles
    // into its "done" state.
    window.setTimeout(() => {
      completeTask(selectedAthleteId, taskId)
      setJustCompleted((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }, 260)
  }

  const handleClearCompleted = () => {
    clearCompletedTasks(selectedAthleteId)
  }

  return (
    <div className="min-h-[100dvh] bg-[#0a0b10]">
      {/* Header */}
      <header
        data-tour="athlete-tour-wrap-up"
        className="border-b border-border-subtle bg-surface px-4 py-3 md:px-6"
      >
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
              {athlete.sport.charAt(0).toUpperCase() + athlete.sport.slice(1)}
            </span>
          </div>
          <RoleToggle />
        </div>
      </header>

      <div data-tour="athlete-home-daily" className="mx-auto max-w-2xl px-4 py-6 md:px-6">
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
            {totalSkills > 0 && masteredCount === totalSkills
              ? 'All skills mastered - peak performance unlocked.'
              : masteredCount > 0
                ? `Working on ${frontierSkills.length} frontier skill${frontierSkills.length === 1 ? '' : 's'}`
                : 'Just getting started - build your foundation.'}
          </p>
        </div>

        {/* Onboarding gate */}
        {!diagnostic && (
          <div className="mt-6 border border-alpha/30 bg-gradient-to-br from-alpha/10 to-transparent p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-alpha-light">
              Awaiting onboarding
            </p>
            <p className="mt-1 text-sm font-bold text-white">
              Your coach will run a quick diagnostic with you to place you on the skill graph.
            </p>
            <p className="mt-1 text-[12px] leading-snug text-slate-400">
              You'll see your Training Menu as soon as that's done. It mixes new-skill work with
              spaced reviews of things you already know.
            </p>
          </div>
        )}

        {/* Frontier progress */}
        {diagnostic && frontierSkills.length > 0 && (
          <section className="mt-6">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Frontier Progress
            </h2>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {frontierSkills.slice(0, 4).map((skill) => {
                const xp = Math.max(0, Math.min(100, skillProgressMap[skill.id] ?? 0))
                return (
                  <div
                    key={skill.id}
                    className="border border-blue-500/20 bg-blue-500/5 p-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate text-[11px] font-semibold text-blue-200">
                        {skill.label}
                      </span>
                      <span className="ml-2 text-[10px] tabular-nums text-blue-400">
                        {xp}%
                      </span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden bg-blue-500/10">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${xp}%` }}
                        aria-hidden
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Training Menu */}
        {diagnostic && (
          <section className="mt-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Your Training Menu
              </h2>
              <div className="flex items-center gap-2">
                {completedVisibleCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCompleted}
                    className="border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 transition hover:border-emerald-400/60 hover:bg-emerald-500/20 hover:text-emerald-200"
                    aria-label={`Clear ${completedVisibleCount} completed task${completedVisibleCount === 1 ? '' : 's'}`}
                  >
                    Clear {completedVisibleCount} done
                  </button>
                )}
                <span className="text-[10px] tabular-nums text-slate-600">
                  {dashboardTasks.length} item{dashboardTasks.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">
              Check one off and the next best task drops in. Completed tasks stay below in green - tap them again to undo, or hit Clear when you're ready.
            </p>

            {!supportsAdaptive && (
              <div className="mt-3 border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                This is the legacy plan. Ask your coach to regenerate to unlock adaptive onboarding and FIRe reviews.
              </div>
            )}

            <ul className="mt-3 space-y-2">
              {dashboardTasks.length === 0 && (
                <li className="border border-border-subtle bg-surface-raised p-4 text-center text-[11px] italic text-slate-500">
                  No eligible tasks - your coach may need to regenerate your plan.
                </li>
              )}
              {sortedDashboardTasks.map((t) => {
                const isCompleted = completedSet.has(t.id)
                const isCompleting = justCompleted.has(t.id)
                return (
                  <TrainingMenuRow
                    key={t.id}
                    task={t}
                    skillById={skillById}
                    prereqClosure={prereqClosure}
                    due={due}
                    topImportance={topImportance}
                    postreqClosure={postreqClosure}
                    skillProgress={skillProgressMap}
                    mastered={mastered}
                    checked={isCompleted || isCompleting}
                    completed={isCompleted}
                    onToggle={() => handleToggle(t.id)}
                  />
                )
              })}
            </ul>
          </section>
        )}

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

function TrainingMenuRow({
  task,
  skillById,
  prereqClosure,
  postreqClosure,
  due,
  topImportance,
  skillProgress,
  mastered,
  checked,
  completed,
  onToggle,
}: {
  task: TodayTask
  skillById: Record<string, SkillDef>
  prereqClosure: Record<string, Set<string>>
  postreqClosure: Record<string, Set<string>>
  due: Set<string>
  topImportance: number
  skillProgress: Record<string, number>
  mastered: Set<string>
  checked: boolean
  completed: boolean
  onToggle: () => void
}) {
  const skill = task.skillId ? skillById[task.skillId] : null
  const imp = importance({ task, prereqClosure, postreqClosure, due })
  const knocked = task.skillId
    ? reviewsKnockedOut(task.skillId, prereqClosure, due)
    : 0
  const isHighPriority = topImportance > 0 && imp / topImportance >= 0.75
  const isFrontierTask = task.skillId ? !mastered.has(task.skillId) : false
  const xpPct = task.skillId && isFrontierTask
    ? Math.max(0, Math.min(100, skillProgress[task.skillId] ?? 0))
    : null
  const xp = task.xp ?? 0

  const containerClasses = completed
    ? 'flex items-start gap-3 border border-emerald-500/30 bg-emerald-500/[0.06] p-3'
    : 'flex items-start gap-3 border border-border-subtle bg-surface-raised p-3'

  return (
    <li className={containerClasses}>
      <button
        type="button"
        onClick={onToggle}
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border transition ${
          checked
            ? 'border-emerald-500 bg-emerald-500 text-white hover:border-emerald-400 hover:bg-emerald-400'
            : 'border-slate-600 bg-transparent hover:border-emerald-400'
        }`}
        aria-label={completed ? `Uncheck ${task.shortLabel}` : `Mark ${task.shortLabel} done`}
        aria-pressed={completed}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-semibold ${
            completed
              ? 'text-emerald-300/90 line-through decoration-emerald-500/50'
              : 'text-white'
          }`}
        >
          {task.title}
        </p>
        {task.rationale && (
          <p
            className={`mt-0.5 text-[11px] leading-snug ${
              completed ? 'text-emerald-300/50' : 'text-slate-500'
            }`}
          >
            {task.rationale}
          </p>
        )}
        {!task.rationale && task.detail && (
          <p
            className={`mt-0.5 text-[11px] leading-snug ${
              completed ? 'text-emerald-300/50' : 'text-slate-500'
            }`}
          >
            {task.detail}
          </p>
        )}
        {completed ? (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span className="border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              ✓ Done
            </span>
            {skill && (
              <span className="border border-emerald-500/20 bg-emerald-500/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-emerald-300/70">
                → {skill.label}
              </span>
            )}
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {skill && (
              <span className="border border-border-subtle bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-slate-300">
                → {skill.label}
              </span>
            )}
            {xp > 0 && xpPct !== null && (
              <span className="border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                +{xp}% toward {skill?.label ?? 'skill'}
              </span>
            )}
            {xp > 0 && xpPct === null && (
              <span className="border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                Review
              </span>
            )}
            {xp > 0 && (
              <span className="border border-border-subtle bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                ≈{xp} min
              </span>
            )}
            {knocked >= 2 && (
              <span className="border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                Knocks out {knocked} review{knocked === 1 ? '' : 's'}
              </span>
            )}
            {isHighPriority && (
              <span className="border border-alpha/40 bg-alpha/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-alpha-light">
                ⚡ High priority
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  )
}
