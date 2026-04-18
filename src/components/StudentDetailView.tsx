import { useMemo, useState } from 'react'
import { ATHLETE_BY_ID, getInitials } from '../data/athletes'
import { skillsForSport, type SkillDef } from '../data/graph'
import type { TodayTask } from '../data/student'
import { formatDueRelative } from '../lib/fire'
import { deltaViewFromGraphs } from '../lib/graphDelta'
import { useFrontierStore } from '../store/useFrontierStore'
import { DiagnosticRunner } from './DiagnosticRunner'
import { RoleToggle } from './RoleToggle'
import { SkillTreeView } from './skill-tree/SkillTreeView'

interface StudentDetailViewProps {
  athleteId: string
  onBack: () => void
  onFineTune: () => void
}

export function StudentDetailView({ athleteId, onBack, onFineTune }: StudentDetailViewProps) {
  const athlete = ATHLETE_BY_ID[athleteId]
  const getResolvedAthleteGraph = useFrontierStore((s) => s.getResolvedAthleteGraph)
  const athleteMastery = useFrontierStore((s) => s.athleteMastery)
  const athleteConditional = useFrontierStore((s) => s.athleteConditional)
  const athleteReviewState = useFrontierStore((s) => s.athleteReviewState)
  const athleteSkillProgress = useFrontierStore((s) => s.athleteSkillProgress)
  const athleteDiagnostic = useFrontierStore((s) => s.athleteDiagnostic)
  const athleteReonboardStatus = useFrontierStore((s) => s.athleteReonboardStatus)
  const athleteGraphDraftDeltas = useFrontierStore((s) => s.athleteGraphDraftDeltas)
  const sportPlans = useFrontierStore((s) => s.sportPlans)
  const getDashboardTasks = useFrontierStore((s) => s.getDashboardTasks)
  const overrideMastery = useFrontierStore((s) => s.overrideMastery)
  const clearDiagnostic = useFrontierStore((s) => s.clearDiagnostic)
  const confirmReonboard = useFrontierStore((s) => s.confirmReonboard)
  const acceptAthleteDraft = useFrontierStore((s) => s.acceptAthleteDraft)

  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [diagnosticOpen, setDiagnosticOpen] = useState(false)

  const resolvedGraph = useMemo(() => getResolvedAthleteGraph(athleteId), [getResolvedAthleteGraph, athleteId])
  const skills: SkillDef[] = useMemo(() => {
    if (resolvedGraph?.skills && resolvedGraph.skills.length > 0) return resolvedGraph.skills
    if (!athlete) return []
    return skillsForSport(athlete.sport)
  }, [resolvedGraph, athlete])

  const teamPlanGraph = athlete ? sportPlans[athlete.sport] ?? null : null
  const deltaView = useMemo(
    () => (teamPlanGraph && resolvedGraph ? deltaViewFromGraphs(teamPlanGraph.graph, resolvedGraph) : null),
    [teamPlanGraph, resolvedGraph],
  )

  const mastered = athleteMastery[athleteId] ?? new Set<string>()
  const conditional = athleteConditional[athleteId] ?? {}
  const reviewState = athleteReviewState[athleteId] ?? {}
  const skillProgress = athleteSkillProgress[athleteId] ?? {}
  const diagnostic = athleteDiagnostic[athleteId]
  const reonboardStatus = athleteReonboardStatus[athleteId]
  const draftDelta = athleteGraphDraftDeltas[athleteId] ?? null
  const dashboardTasks = useMemo(
    () => getDashboardTasks(athleteId),
    [getDashboardTasks, athleteId, diagnostic, mastered],
  )

  if (!athlete) return null

  const masteredSkills = skills.filter((s) => mastered.has(s.id))
  const conditionalSkills = skills.filter((s) => conditional[s.id])
  const frontierSkills = skills.filter((s) => {
    if (mastered.has(s.id)) return false
    return s.prereqs.every((p) => mastered.has(p))
  })
  const dueForReview = skills
    .filter((s) => mastered.has(s.id) && reviewState[s.id] && reviewState[s.id].dueAt <= Date.now())
    .sort((a, b) => reviewState[a.id].dueAt - reviewState[b.id].dueAt)
  const upcomingReviews = skills
    .filter((s) => mastered.has(s.id) && reviewState[s.id] && reviewState[s.id].dueAt > Date.now())
    .sort((a, b) => reviewState[a.id].dueAt - reviewState[b.id].dueAt)
    .slice(0, 5)

  const supportsAdaptive = skills.some((s) => !!s.diagnosticPrompt)

  const handleRerunDiagnostic = () => {
    setDiagnosticOpen(true)
  }

  const handleDiagnosticFinish = () => {
    setDiagnosticOpen(false)
  }

  const handleOverrideMastery = () => {
    if (!selectedSkill) return
    const current = mastered.has(selectedSkill)
    const nextLabel = current ? 'unmark' : 'mark as'
    const ok = window.confirm(`Coach override: ${nextLabel} mastered for "${selectedSkill}"?`)
    if (!ok) return
    overrideMastery(athleteId, selectedSkill, !current)
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#0a0b10]">
      {diagnosticOpen && (
        <DiagnosticRunner
          athlete={athlete}
          onFinish={handleDiagnosticFinish}
          onCancel={() => setDiagnosticOpen(false)}
        />
      )}
      <header className="flex shrink-0 items-center gap-3 border-b border-border-subtle bg-surface px-3 py-2.5 md:gap-4 md:px-4">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 border border-border-subtle bg-surface-raised px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-border-default hover:text-white"
        >
          ← Roster
        </button>
        <div
          data-tour="student-onboarding-stats"
          className="flex min-w-0 flex-1 items-center gap-3 md:gap-4"
        >
          {athlete.avatarUrl ? (
            <img
              src={athlete.avatarUrl}
              alt=""
              width={36}
              height={36}
              className="hidden h-9 w-9 shrink-0 border border-border-subtle sm:block"
            />
          ) : (
            <span
              className="hidden h-9 w-9 shrink-0 items-center justify-center text-sm font-bold text-white sm:flex"
              style={{ backgroundColor: athlete.avatarColor }}
            >
              {getInitials(athlete.displayName)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-white">{athlete.displayName}</p>
              {reonboardStatus?.aiReonboarded && !reonboardStatus.confirmed && (
                <span
                  className="shrink-0 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300"
                  title={reonboardStatus.rationale}
                >
                  AI re-onboarded
                </span>
              )}
              {draftDelta && (
                <span
                  className="shrink-0 border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sky-300"
                  title="A fine-tuned plan is drafted but not yet accepted into the training menu."
                >
                  Pending fine-tune
                </span>
              )}
            </div>
            <p className="truncate text-[11px] text-slate-500">
              {athlete.position} · {athlete.schoolYear} · {masteredSkills.length}/{skills.length} mastered
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {draftDelta && (
            <button
              type="button"
              onClick={() => acceptAthleteDraft(athleteId)}
              title="Push the pending fine-tune draft to this athlete's training menu"
              className="shrink-0 border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-300 transition hover:border-sky-500/70 hover:bg-sky-500/20 hover:text-sky-200"
            >
              Accept fine-tune
            </button>
          )}
          <button
            type="button"
            onClick={handleRerunDiagnostic}
            className="shrink-0 border border-border-subtle bg-surface-raised px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300 transition hover:border-border-default hover:text-white"
          >
            {diagnostic ? 'Re-run Diagnostic' : 'Run Diagnostic'}
          </button>
          {reonboardStatus?.aiReonboarded && !reonboardStatus.confirmed && (
            <button
              type="button"
              onClick={() => confirmReonboard(athleteId)}
              className="shrink-0 border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-500/20"
            >
              Confirm onboarding
            </button>
          )}
        </div>
        <RoleToggle />
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {!supportsAdaptive && (
          <div className="absolute left-4 right-4 top-16 z-10 border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200 md:left-6 md:right-6">
            This graph pre-dates adaptive onboarding. Regenerate the team plan to enable diagnostic, FIRe reviews, and XP-graded tasks.
          </div>
        )}

        <div
          data-tour="student-skill-graph"
          className="relative min-h-[50vh] flex-1 lg:min-h-0"
        >
          <SkillTreeView
            selectedId={selectedSkill}
            onSelectNode={setSelectedSkill}
            skillDefs={skills}
            athleteId={athleteId}
            deltaView={deltaView}
          />
        </div>

        <aside className="flex w-full shrink-0 flex-col overflow-y-auto border-t border-border-subtle bg-surface lg:w-[340px] lg:border-l lg:border-t-0">
          <div className="space-y-4 p-4">
            {diagnostic ? (
              <section data-tour="student-training-menu">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Training Menu (student preview)
                  </p>
                  <span className="text-[10px] tabular-nums text-slate-600">
                    {dashboardTasks.length} active
                  </span>
                </div>
                {dashboardTasks.length === 0 ? (
                  <p
                    data-tour="student-task-list"
                    className="mt-2 text-[11px] italic text-slate-500"
                  >
                    No tasks eligible yet. Mark a conditional skill, re-run the diagnostic, or regenerate the plan.
                  </p>
                ) : (
                  <ul data-tour="student-task-list" className="mt-2 space-y-2">
                    {dashboardTasks.map((t) => (
                      <StudentTaskPreview key={t.id} task={t} skills={skills} />
                    ))}
                  </ul>
                )}
              </section>
            ) : (
              <section
                data-tour="student-training-menu"
                className="border border-alpha/30 bg-alpha/10 p-3"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-alpha-light">
                  Awaiting diagnostic
                </p>
                <p className="mt-1 text-[11px] leading-snug text-slate-300">
                  {athlete.firstName} has a plan but hasn't been onboarded yet. Run the diagnostic to establish their frontier.
                </p>
                <button
                  type="button"
                  onClick={handleRerunDiagnostic}
                  className="mt-3 w-full bg-alpha py-2 text-xs font-bold text-white transition hover:bg-alpha-light"
                >
                  Start Diagnostic →
                </button>
              </section>
            )}

            {frontierSkills.length > 0 && (
              <section>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Frontier progress
                </p>
                <ul className="mt-2 space-y-1.5">
                  {frontierSkills.slice(0, 6).map((s) => {
                    const xp = Math.max(0, Math.min(100, skillProgress[s.id] ?? 0))
                    return (
                      <li key={s.id} className="border border-border-subtle bg-surface-raised px-2.5 py-2">
                        <div className="flex items-center justify-between">
                          <span className="truncate text-[11px] font-semibold text-slate-200">
                            {s.label}
                          </span>
                          <span className="ml-2 text-[10px] tabular-nums text-slate-500">
                            {xp}%
                          </span>
                        </div>
                        <div className="mt-1 h-1 w-full overflow-hidden bg-surface-elevated">
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${xp}%` }}
                            aria-hidden
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {dueForReview.length > 0 && (
              <section>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Due for review ({dueForReview.length})
                </p>
                <ul className="mt-2 space-y-1">
                  {dueForReview.slice(0, 5).map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between border border-amber-500/20 bg-amber-500/5 px-2 py-1.5"
                    >
                      <span className="truncate text-[11px] font-semibold text-amber-200">
                        {s.label}
                      </span>
                      <span className="ml-2 text-[10px] tabular-nums text-amber-400">
                        {formatDueRelative(reviewState[s.id].dueAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {upcomingReviews.length > 0 && (
              <section>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Upcoming reviews
                </p>
                <ul className="mt-2 space-y-1">
                  {upcomingReviews.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between border border-border-subtle bg-surface-raised px-2 py-1.5"
                    >
                      <span className="truncate text-[11px] font-medium text-slate-300">
                        {s.label}
                      </span>
                      <span className="ml-2 text-[10px] tabular-nums text-slate-500">
                        {formatDueRelative(reviewState[s.id].dueAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {conditionalSkills.length > 0 && (
              <section>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Conditional ({conditionalSkills.length})
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {conditionalSkills.map((s) => (
                    <span
                      key={s.id}
                      className="border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-200"
                      title={`confidence ${(conditional[s.id].confidence * 100).toFixed(0)}%`}
                    >
                      {s.label}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {selectedSkill && (
              <section className="border border-border-subtle bg-surface-raised p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Selected · {skills.find((s) => s.id === selectedSkill)?.label ?? selectedSkill}
                </p>
                <button
                  type="button"
                  onClick={handleOverrideMastery}
                  className="mt-2 w-full border border-border-subtle bg-transparent py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300 transition hover:border-border-default hover:text-white"
                >
                  Override mastery
                </button>
              </section>
            )}

            <section className="border-t border-border-subtle pt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Advanced
              </p>
              <button
                type="button"
                data-tour="student-finetune-hint"
                onClick={onFineTune}
                className="mt-2 w-full border border-border-subtle bg-transparent py-2 text-[11px] font-semibold text-slate-400 transition hover:border-border-default hover:text-slate-200"
              >
                Fine-tune plan →
              </button>
              {diagnostic && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Clear ${athlete.firstName}'s diagnostic? They will need to be re-onboarded.`)) {
                      clearDiagnostic(athleteId)
                    }
                  }}
                  className="mt-1.5 w-full border border-rose-500/20 bg-transparent py-2 text-[11px] font-semibold text-rose-300 transition hover:border-rose-500/40"
                >
                  Clear diagnostic
                </button>
              )}
            </section>
          </div>
        </aside>
      </div>
    </div>
  )
}

function StudentTaskPreview({
  task,
  skills,
}: {
  task: TodayTask
  skills: SkillDef[]
}) {
  const skill = skills.find((s) => s.id === task.skillId)
  return (
    <li className="border border-border-subtle bg-surface-raised p-2.5">
      <p className="text-[11px] font-semibold leading-tight text-slate-200">{task.title}</p>
      {task.rationale && (
        <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{task.rationale}</p>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {skill && (
          <span className="border border-border-subtle bg-surface-elevated px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
            → {skill.label}
          </span>
        )}
        {typeof task.xp === 'number' && (
          <span className="border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-blue-300">
            {task.xp} XP · ≈{task.xp} min
          </span>
        )}
      </div>
    </li>
  )
}
