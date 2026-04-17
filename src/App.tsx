import { useCallback, useMemo, useState } from 'react'
import { EVENTS, Joyride, STATUS, type EventData } from 'react-joyride'
import { AthleteHome } from './components/AthleteHome'
import { BuilderView } from './components/builder/BuilderView'
import { DiagnosticRunner } from './components/DiagnosticRunner'
import { StudentDetailView } from './components/StudentDetailView'
import { TeamDashboard } from './components/TeamDashboard'
import { ATHLETE_BY_ID } from './data/athletes'
import {
  getDashboardTourSteps,
} from './onboarding/tourSteps'
import { useFrontierStore } from './store/useFrontierStore'

type View = 'dashboard' | 'builder' | 'studentDetail'

interface DiagnosticSummary {
  athleteId: string
  athleteName: string
  mastered: number
  conditional: number
  remaining: number
}

const JOYRIDE_OPTIONS = {
  spotlightRadius: 8,
  primaryColor: '#2563eb',
  zIndex: 10050,
  showProgress: true,
  buttons: ['back', 'close', 'primary', 'skip'] as ('back' | 'close' | 'primary' | 'skip')[],
  textColor: '#e2e8f0',
  backgroundColor: '#191b24',
  arrowColor: '#191b24',
  overlayColor: 'rgba(0, 0, 0, 0.7)',
  width: 380,
}

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null)
  const [diagnosticTargetId, setDiagnosticTargetId] = useState<string | null>(null)
  const [diagnosticSummary, setDiagnosticSummary] = useState<DiagnosticSummary | null>(null)
  const [welcomeVisible, setWelcomeVisible] = useState(false)
  const [dashboardTourRun, setDashboardTourRun] = useState(false)
  const [isOnboarding, setIsOnboarding] = useState(false)
  const selectAthlete = useFrontierStore((s) => s.selectAthlete)
  const userRole = useFrontierStore((s) => s.userRole)
  const builderTarget = useFrontierStore((s) => s.builderTarget)
  const setBuilderTarget = useFrontierStore((s) => s.setBuilderTarget)
  const athleteDiagnostic = useFrontierStore((s) => s.athleteDiagnostic)
  const getAthletesForSport = useFrontierStore((s) => s.getAthletesForSport)
  const selectedSport = useFrontierStore((s) => s.selectedSport)

  const diagnosticAthlete = diagnosticTargetId ? ATHLETE_BY_ID[diagnosticTargetId] : null

  const remainingUnOnboarded = useMemo(() => {
    if (!diagnosticSummary) return []
    return getAthletesForSport(selectedSport).filter(
      (a) => a.id !== diagnosticSummary.athleteId && !athleteDiagnostic[a.id],
    )
  }, [diagnosticSummary, selectedSport, getAthletesForSport, athleteDiagnostic])

  /* ── Welcome modal actions ── */

  const startTour = useCallback(() => {
    setWelcomeVisible(false)
    setIsOnboarding(true)
    requestAnimationFrame(() => setDashboardTourRun(true))
  }, [])

  const skipWelcome = useCallback(() => {
    setWelcomeVisible(false)
  }, [])

  /* ── Dashboard tour events ── */

  const onDashboardTourEvent = useCallback(
    (data: EventData) => {
      if (data.type !== EVENTS.TOUR_END) return
      setDashboardTourRun(false)
      if (
        isOnboarding &&
        (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED)
      ) {
        setIsOnboarding(false)
      }
    },
    [isOnboarding],
  )

  /* ── Navigation ── */

  const handleSelectAthlete = useCallback(
    (id: string) => {
      selectAthlete(id)
      setBuilderTarget({ kind: 'athlete', athleteId: id })
      setView('builder')
    },
    [selectAthlete, setBuilderTarget],
  )

  const handleOpenDetail = useCallback(
    (id: string) => {
      selectAthlete(id)
      setActiveStudentId(id)
      setView('studentDetail')
    },
    [selectAthlete],
  )

  const handleOnboardAthlete = useCallback(
    (id: string) => {
      selectAthlete(id)
      setDiagnosticTargetId(id)
      setDiagnosticSummary(null)
    },
    [selectAthlete],
  )

  const handleDiagnosticFinish = useCallback(
    (summary: {
      athlete: { id: string; displayName: string; firstName: string }
      mastered: string[]
      conditional: string[]
      remaining: string[]
    }) => {
      setDiagnosticSummary({
        athleteId: summary.athlete.id,
        athleteName: summary.athlete.firstName,
        mastered: summary.mastered.length,
        conditional: summary.conditional.length,
        remaining: summary.remaining.length,
      })
      setDiagnosticTargetId(null)
    },
    [],
  )

  const handleDiagnosticCancel = useCallback(() => {
    setDiagnosticTargetId(null)
    setDiagnosticSummary(null)
  }, [])

  const handleChainNextOrDone = useCallback(
    (chain: boolean) => {
      if (!chain || remainingUnOnboarded.length === 0) {
        setDiagnosticSummary(null)
        return
      }
      const next = remainingUnOnboarded[0]
      setDiagnosticSummary(null)
      selectAthlete(next.id)
      setDiagnosticTargetId(next.id)
    },
    [remainingUnOnboarded, selectAthlete],
  )

  const handleOpenDetailFromSummary = useCallback(() => {
    if (!diagnosticSummary) return
    const id = diagnosticSummary.athleteId
    setDiagnosticSummary(null)
    handleOpenDetail(id)
  }, [diagnosticSummary, handleOpenDetail])

  const handleGenerateTeamPlan = useCallback(
    (sport: string) => {
      setBuilderTarget({ kind: 'sport', sport })
      setView('builder')
    },
    [setBuilderTarget],
  )

  const backToDashboard = useCallback(() => {
    setView('dashboard')
    setBuilderTarget(null)
    setActiveStudentId(null)
  }, [setBuilderTarget])

  const openFineTuneFromDetail = useCallback(() => {
    if (!activeStudentId) return
    setBuilderTarget({ kind: 'athlete', athleteId: activeStudentId })
    setView('builder')
  }, [activeStudentId, setBuilderTarget])

  /* ── Manual replay ── */

  const replayDashboardTour = useCallback(() => {
    setIsOnboarding(true)
    setDashboardTourRun(false)
    requestAnimationFrame(() => setDashboardTourRun(true))
  }, [])

  /* ── Athlete mode ── */

  if (userRole === 'athlete') {
    return <AthleteHome />
  }

  /* ── Coach mode ── */

  const showBuilder = view === 'builder' && !!builderTarget
  const showDetail = view === 'studentDetail' && !!activeStudentId

  return (
    <>
      {/* Dashboard tour */}
      {view === 'dashboard' && (
        <Joyride
          key="phase-dashboard"
          run={dashboardTourRun}
          steps={getDashboardTourSteps()}
          continuous
          scrollToFirstStep
          onEvent={onDashboardTourEvent}
          options={JOYRIDE_OPTIONS}
        />
      )}

      {/* Welcome modal */}
      {welcomeVisible && view === 'dashboard' && (
        <WelcomeModal onStartTour={startTour} onSkip={skipWelcome} />
      )}

      {/* Diagnostic modal */}
      {diagnosticAthlete && (
        <DiagnosticRunner
          athlete={diagnosticAthlete}
          onFinish={handleDiagnosticFinish}
          onCancel={handleDiagnosticCancel}
        />
      )}

      {/* Diagnostic summary modal */}
      {diagnosticSummary && (
        <DiagnosticChainPrompt
          summary={diagnosticSummary}
          nextName={remainingUnOnboarded[0]?.firstName ?? null}
          onContinue={() => handleChainNextOrDone(true)}
          onDone={() => handleChainNextOrDone(false)}
          onOpenDetail={handleOpenDetailFromSummary}
        />
      )}

      {/* Views */}
      {showBuilder ? (
        <BuilderView
          target={builderTarget!}
          onBack={backToDashboard}
        />
      ) : showDetail ? (
        <StudentDetailView
          athleteId={activeStudentId!}
          onBack={backToDashboard}
          onFineTune={openFineTuneFromDetail}
        />
      ) : (
        <TeamDashboard
          onOnboardAthlete={handleOnboardAthlete}
          onOpenDetail={handleOpenDetail}
          onSelectAthlete={handleSelectAthlete}
          onGenerateTeamPlan={handleGenerateTeamPlan}
          onReplayTour={replayDashboardTour}
        />
      )}
    </>
  )
}

/* ── Diagnostic summary + chain prompt ── */

function DiagnosticChainPrompt({
  summary,
  nextName,
  onContinue,
  onDone,
  onOpenDetail,
}: {
  summary: DiagnosticSummary
  nextName: string | null
  onContinue: () => void
  onDone: () => void
  onOpenDetail: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md border border-border-subtle bg-surface-raised p-6 shadow-2xl">
        <p className="text-[10px] font-bold uppercase tracking-widest text-alpha-light">
          Onboarded
        </p>
        <p className="mt-1 text-lg font-bold text-white">
          {summary.athleteName} is on the graph.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Mastered" value={summary.mastered} color="text-emerald-400" />
          <Stat label="Conditional" value={summary.conditional} color="text-amber-400" />
          <Stat label="To learn" value={summary.remaining} color="text-slate-400" />
        </div>
        <div className="mt-5 space-y-2">
          {nextName ? (
            <button
              type="button"
              onClick={onContinue}
              className="w-full bg-alpha py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-alpha-light"
            >
              Continue with {nextName} →
            </button>
          ) : null}
          <button
            type="button"
            onClick={onOpenDetail}
            className="w-full border border-border-subtle bg-transparent py-2.5 text-xs font-semibold text-slate-300 transition hover:border-border-default hover:text-white"
          >
            View {summary.athleteName}'s Training Menu →
          </button>
          <button
            type="button"
            onClick={onDone}
            className="w-full border border-border-subtle bg-transparent py-2 text-[11px] font-semibold text-slate-500 transition hover:text-slate-300"
          >
            Done for now
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="border border-border-subtle bg-surface-elevated px-2 py-2 text-center">
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  )
}

/* ── Welcome Modal ── */

function WelcomeModal({
  onStartTour,
  onSkip,
}: {
  onStartTour: () => void
  onSkip: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[10100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="w-full max-w-sm border border-border-subtle bg-surface-raised p-6 shadow-2xl shadow-alpha/10 md:p-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-alpha-light">
          Frontier OS
        </p>
        <p
          id="welcome-title"
          className="mt-1 text-lg font-bold tracking-tight text-white"
        >
          Texas Sports Academy
        </p>
        <p className="mt-0.5 text-sm text-slate-400">
          Baseball Development Dashboard
        </p>

        <p className="mt-5 text-sm leading-relaxed text-slate-400">
          A guided tour walks through the roster, team heatmap, skill map,
          athlete daily view, and every learning-science technique powering
          development. Takes about two minutes.
        </p>

        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={onStartTour}
            className="w-full bg-alpha py-3 text-sm font-bold text-white transition hover:bg-alpha-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-alpha"
          >
            Start tour
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="w-full border border-border-subtle bg-transparent py-2.5 text-xs font-semibold text-slate-400 transition hover:border-border-default hover:text-slate-300"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
