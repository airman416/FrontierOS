import { useMemo, useState } from 'react'
import type { Athlete } from '../data/athletes'
import { getInitials } from '../data/athletes'
import type { SkillDef } from '../data/graph'
import { skillsForSport } from '../data/graph'
import {
  applyVerdict,
  buildDiagnosticEngine,
  createInitialDiagnosticState,
  isProbeable,
  remainingProbeableCount,
  runInferencePass,
  selectNextProbe,
  totalProbeableCount,
  type DiagnosticStatus,
  type DiagnosticVerdict,
} from '../lib/diagnostic'
import { useFrontierStore } from '../store/useFrontierStore'

interface DiagnosticRunnerProps {
  athlete: Athlete
  onFinish: (summary: {
    athlete: Athlete
    mastered: string[]
    conditional: string[]
    remaining: string[]
  }) => void
  onCancel: () => void
}

type Stage = 'intro' | 'probing' | 'summary'

const VERDICT_LABEL: Record<DiagnosticVerdict, string> = {
  pass: 'Pass',
  fail: 'Fail',
  conditional: 'Partial',
}

const VERDICT_HELP: Record<DiagnosticVerdict, string> = {
  pass: 'Clean execution - meets the benchmark.',
  fail: 'Missed the benchmark - can\'t do this yet.',
  conditional: 'Partial / slow / hesitant - knows the idea but shaky.',
}

export function DiagnosticRunner({ athlete, onFinish, onCancel }: DiagnosticRunnerProps) {
  const getResolvedAthleteGraph = useFrontierStore((s) => s.getResolvedAthleteGraph)
  const runDiagnostic = useFrontierStore((s) => s.runDiagnostic)

  const skills: SkillDef[] = useMemo(() => {
    const resolved = getResolvedAthleteGraph(athlete.id)
    if (resolved?.skills && resolved.skills.length > 0) return resolved.skills
    return skillsForSport(athlete.sport)
  }, [athlete, getResolvedAthleteGraph])

  const engine = useMemo(() => buildDiagnosticEngine(skills), [skills])
  const [state, setState] = useState(() => createInitialDiagnosticState(skills))
  const [note, setNote] = useState('')
  const [stage, setStage] = useState<Stage>('intro')

  const currentProbe = useMemo(() => selectNextProbe(engine, state), [engine, state])
  const probesRemaining = remainingProbeableCount(engine, state)
  const totalProbes = useMemo(() => totalProbeableCount(engine), [engine])
  const graded = totalProbes - probesRemaining

  // Resolve inferred statuses at commit time. The summary panel previews this.
  const inferredState = useMemo(
    () => runInferencePass(engine, state),
    [engine, state],
  )

  const handleVerdict = (verdict: DiagnosticVerdict) => {
    if (!currentProbe) return
    const nextState = applyVerdict(engine, state, currentProbe.id, verdict, note.trim() || undefined)
    setState(nextState)
    setNote('')
    if (remainingProbeableCount(engine, nextState) === 0) {
      setStage('summary')
    }
  }

  const handleStart = () => setStage('probing')

  const handleFinish = () => {
    // Let the inference pass own the decision for any still-unknown skill
    // (levels 5–6 + anything without an on-the-spot prompt).
    const committedStatus = inferredState.status
    const simple: Record<string, 'known' | 'not-known' | 'conditional' | 'unknown'> = {}
    for (const [k, v] of Object.entries(committedStatus)) simple[k] = v
    runDiagnostic(athlete.id, inferredState.log, simple)

    const mastered: string[] = []
    const conditional: string[] = []
    const remaining: string[] = []
    for (const [id, status] of Object.entries(committedStatus)) {
      if (status === 'known') mastered.push(id)
      else if (status === 'conditional') conditional.push(id)
      else remaining.push(id)
    }
    onFinish({ athlete, mastered, conditional, remaining })
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col border border-border-subtle bg-surface-raised shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-border-subtle px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {athlete.avatarUrl ? (
              <img
                src={athlete.avatarUrl}
                alt=""
                className="h-10 w-10 border border-border-subtle"
              />
            ) : (
              <span
                className="flex h-10 w-10 items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: athlete.avatarColor }}
              >
                {getInitials(athlete.displayName)}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-alpha-light">
                Onboarding Diagnostic
              </p>
              <p className="truncate text-sm font-bold text-white">{athlete.displayName}</p>
              <p className="truncate text-[11px] text-slate-500">
                {athlete.position} · {athlete.schoolYear}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 border border-border-subtle bg-transparent px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 transition hover:text-white"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {stage === 'intro' && (
            <IntroPanel
              athlete={athlete}
              totalProbes={totalProbes}
              onStart={handleStart}
            />
          )}
          {stage === 'probing' && currentProbe && (
            <ProbePanel
              skill={currentProbe}
              graded={graded}
              totalProbes={totalProbes}
              note={note}
              onNoteChange={setNote}
              onVerdict={handleVerdict}
            />
          )}
          {stage === 'summary' && (
            <SummaryPanel
              athlete={athlete}
              skills={skills}
              status={inferredState.status}
              probedStatus={state.status}
              onFinish={handleFinish}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function IntroPanel({
  athlete,
  totalProbes,
  onStart,
}: {
  athlete: Athlete
  totalProbes: number
  onStart: () => void
}) {
  const expected = Math.max(3, Math.round(Math.log2(Math.max(2, totalProbes)) + 2))
  return (
    <div className="space-y-4 px-5 py-5">
      <p className="text-sm leading-relaxed text-slate-300">
        Walk {athlete.firstName} through the on-the-spot probes. For each, run the drill live and
        pick <span className="font-semibold text-emerald-400">Pass</span>,{' '}
        <span className="font-semibold text-rose-400">Fail</span>, or{' '}
        <span className="font-semibold text-amber-400">Partial</span>.
      </p>
      <p className="text-[12px] leading-snug text-slate-400">
        Only foundation + development skills (Lvl 1–4) are probed here - integration &amp; peak-game
        skills (Lvl 5–6) aren't gradeable in a single drill, so we <span className="font-semibold text-slate-300">infer</span> them from
        the prerequisites once probing is done.
      </p>
      <ul className="space-y-1.5 text-[12px] leading-snug text-slate-400">
        <li className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-emerald-500" aria-hidden />
          <span>
            <span className="font-semibold text-emerald-400">Pass</span> - the skill and all its prereqs drop out of the queue.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-rose-500" aria-hidden />
          <span>
            <span className="font-semibold text-rose-400">Fail</span> - the skill and anything built on top of it stays unknown.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-amber-500" aria-hidden />
          <span>
            <span className="font-semibold text-amber-400">Partial</span> - counts as known, but flagged for extra scrutiny in review.
          </span>
        </li>
      </ul>
      <p className="text-[11px] text-slate-500">
        ~{expected} probes expected (of {totalProbes} on-the-spot drills). You can stop at any time.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="w-full bg-alpha py-3 text-sm font-bold text-white transition hover:bg-alpha-light"
      >
        Start diagnostic →
      </button>
    </div>
  )
}

function ProbePanel({
  skill,
  graded,
  totalProbes,
  note,
  onNoteChange,
  onVerdict,
}: {
  skill: SkillDef
  graded: number
  totalProbes: number
  note: string
  onNoteChange: (s: string) => void
  onVerdict: (v: DiagnosticVerdict) => void
}) {
  const pct = totalProbes > 0 ? Math.round((graded / totalProbes) * 100) : 0
  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Probe · Lvl {skill.level}
          </span>
          <span className="text-[11px] tabular-nums text-slate-500">
            {graded} / {totalProbes} probed
          </span>
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden bg-surface-elevated">
          <div
            className="h-full bg-alpha transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div>
        <p className="text-base font-bold text-white">{skill.label}</p>
        {skill.summary && (
          <p className="mt-1 text-[12px] leading-snug text-slate-400">{skill.summary}</p>
        )}
      </div>

      <div className="border border-border-subtle bg-surface-elevated p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-alpha-light">
          Coach probe
        </p>
        <p className="mt-1 text-sm leading-snug text-slate-200">
          {skill.diagnosticPrompt ?? (
            <span className="italic text-slate-500">
              No diagnostic prompt on this skill - use your judgment. (Regenerate the team plan to add one.)
            </span>
          )}
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Notes (optional)
        </span>
        <textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={2}
          placeholder="Observations - only seen in the log."
          className="resize-none border border-border-subtle bg-surface-elevated px-2.5 py-2 text-[12px] text-slate-200 outline-none transition focus:border-alpha"
        />
      </label>

      <div className="grid grid-cols-3 gap-2">
        <VerdictButton verdict="pass" onClick={() => onVerdict('pass')} />
        <VerdictButton verdict="conditional" onClick={() => onVerdict('conditional')} />
        <VerdictButton verdict="fail" onClick={() => onVerdict('fail')} />
      </div>
    </div>
  )
}

function VerdictButton({
  verdict,
  onClick,
}: {
  verdict: DiagnosticVerdict
  onClick: () => void
}) {
  const colorClass =
    verdict === 'pass'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
      : verdict === 'fail'
        ? 'border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
        : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 border px-3 py-3 text-xs font-bold uppercase tracking-wider transition ${colorClass}`}
    >
      <span>{VERDICT_LABEL[verdict]}</span>
      <span className="text-[9px] font-medium normal-case tracking-normal opacity-70">
        {VERDICT_HELP[verdict]}
      </span>
    </button>
  )
}

function SummaryPanel({
  athlete,
  skills,
  status,
  probedStatus,
  onFinish,
}: {
  athlete: Athlete
  skills: SkillDef[]
  /** Final status after the inference pass. */
  status: Record<string, DiagnosticStatus>
  /** Status just from probing + propagation (pre-inference). Used to split
   * the summary into what was observed vs. what was inferred. */
  probedStatus: Record<string, DiagnosticStatus>
  onFinish: () => void
}) {
  const counts = { known: 0, conditional: 0, notKnown: 0 }
  for (const s of skills) {
    const st = status[s.id]
    if (st === 'known') counts.known += 1
    else if (st === 'conditional') counts.conditional += 1
    else counts.notKnown += 1
  }

  // Skills whose status came from the inference pass (never probed,
  // never propagated). These are typically Lvl 5–6 integration skills.
  const inferred = skills
    .filter((s) => {
      const before = probedStatus[s.id]
      return (
        !isProbeable(s) ||
        before === 'unknown'
      ) && before !== status[s.id]
    })
    .map((s) => ({ skill: s, finalStatus: status[s.id] }))

  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-alpha-light">
          Diagnostic complete
        </p>
        <p className="mt-1 text-base font-bold text-white">
          {athlete.firstName} is onboarded.
        </p>
        <p className="mt-1 text-[12px] leading-snug text-slate-400">
          We'll seed the skill graph, review schedule, and Training Menu from this diagnostic. You can re-run anytime from their detail view.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <SummaryStat label="Mastered" value={counts.known} color="text-emerald-400" />
        <SummaryStat label="Conditional" value={counts.conditional} color="text-amber-400" />
        <SummaryStat label="To learn" value={counts.notKnown} color="text-slate-400" />
      </div>

      {inferred.length > 0 && (
        <div className="border border-border-subtle bg-surface-elevated px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-alpha-light">
            Inferred from prereqs
          </p>
          <p className="mt-1 text-[11px] leading-snug text-slate-500">
            These skills can't be graded in a single on-the-spot drill - status was derived from
            prerequisite coverage.
          </p>
          <ul className="mt-2 space-y-1">
            {inferred.map(({ skill, finalStatus }) => (
              <li
                key={skill.id}
                className="flex items-center justify-between gap-2 text-[12px]"
              >
                <span className="truncate text-slate-200">
                  <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    L{skill.level}
                  </span>
                  {skill.label}
                </span>
                <InferredBadge status={finalStatus} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={onFinish}
        className="w-full bg-alpha py-3 text-sm font-bold text-white transition hover:bg-alpha-light"
      >
        Commit results →
      </button>
    </div>
  )
}

function InferredBadge({ status }: { status: DiagnosticStatus }) {
  if (status === 'known') {
    return (
      <span className="shrink-0 border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
        Known
      </span>
    )
  }
  if (status === 'conditional') {
    return (
      <span className="shrink-0 border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
        Conditional
      </span>
    )
  }
  return (
    <span className="shrink-0 border border-slate-600/60 bg-slate-600/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
      To learn
    </span>
  )
}

function SummaryStat({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="border border-border-subtle bg-surface-elevated px-3 py-2.5 text-center">
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  )
}
