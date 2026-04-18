import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { TourProvider, useTour } from '@reactour/tour'
import { AthleteHome } from './components/AthleteHome'
import { BuilderView, type BuilderStage } from './components/builder/BuilderView'
import { DiagnosticRunner } from './components/DiagnosticRunner'
import { StudentDetailView } from './components/StudentDetailView'
import { TeamDashboard } from './components/TeamDashboard'
import { ATHLETE_BY_ID } from './data/athletes'
import {
  builderChatTourSteps,
  builderFormTourSteps,
  dashboardFirstStep,
  diagnosticSummaryTrainingMenuStep,
  ROLE_TOGGLE_TOUR_SELECTOR,
  studentDetailTourSteps,
} from './onboarding/tourSteps'
import { TourCloseButton } from './onboarding/TourCloseButton'
import { TourContentScroll } from './onboarding/TourContentScroll'
import { useFrontierStore } from './store/useFrontierStore'

type View = 'dashboard' | 'builder' | 'studentDetail'

interface DiagnosticSummary {
  athleteId: string
  athleteName: string
  mastered: number
  conditional: number
  remaining: number
}

const INTRO_DISMISSED_KEY = 'frontieros_intro_dismissed_v1'

function isIntroDismissed(): boolean {
  try {
    return localStorage.getItem(INTRO_DISMISSED_KEY) === '1'
  } catch {
    return true
  }
}

function persistIntroDismissed(): void {
  try {
    localStorage.setItem(INTRO_DISMISSED_KEY, '1')
  } catch {
    /* ignore quota / private mode */
  }
}

/** Above WelcomeModal backdrop (z-[10100]) so the tour mask is never trapped underneath it. */
const coachTourStyles = {
  maskWrapper: (base: Record<string, unknown>) => ({
    ...base,
    zIndex: 10200,
  }),
  /**
   * Reactour defaults: “enabled” arrow uses #646464 and “disabled” uses #caccce — on a dark popover
   * the lighter stroke reads as the active control. Swap contrast so forward (enabled) reads clearly.
   */
  arrow: (base: Record<string, unknown>, state?: { disabled?: boolean }) => ({
    ...base,
    color: state?.disabled ? '#52525b' : '#f1f5f9',
  }),
  popover: (base: CSSProperties) =>
    ({
      ...base,
      backgroundColor: '#191b24',
      color: '#e2e8f0',
      borderRadius: 0,
      maxWidth: 380,
      /** Don’t clip the badge (negative top/left); long copy scrolls inside `TourContentScroll` instead. */
      overflow: 'visible',
      zIndex: 10201,
    }) as CSSProperties,
}

export default function App() {
  const userRole = useFrontierStore((s) => s.userRole)

  // Mask click no-op so the dimmed overlay does not dismiss the tour; X still closes (TourCloseButton).
  // Provider wraps coach and athlete views so the tour can continue after switching roles (student-detail walkthrough).
  return (
    <TourProvider
      steps={[dashboardFirstStep(false)]}
      styles={coachTourStyles}
      components={{ Close: TourCloseButton, Content: TourContentScroll }}
      rtl={false}
      scrollSmooth
      padding={{ mask: 10, popover: 16 }}
      showPrevNextButtons
      showNavigation
      showCloseButton
      showBadge
      className="frontier-coach-tour"
      onClickMask={() => {}}
    >
      <FrontierTourChromeSync />
      <AthleteTourStepAdvance />
      {userRole === 'athlete' ? <AthleteHome /> : <CoachApp />}
    </TourProvider>
  )
}

/** Keeps Reactour `disabledActions` in sync with the active step while on coach or athlete UI. */
function FrontierTourChromeSync() {
  const { isOpen, steps, currentStep, setDisabledActions } = useTour()
  useEffect(() => {
    if (!isOpen || !setDisabledActions || steps.length === 0) return
    const step = steps[currentStep]
    setDisabledActions(step?.disableActions === true)
  }, [isOpen, steps, currentStep, setDisabledActions])
  return null
}

/** After the coach taps Athlete on the role toggle, advance to the athlete-home preview step. */
function AthleteTourStepAdvance() {
  const userRole = useFrontierStore((s) => s.userRole)
  const { isOpen, currentStep, steps, setCurrentStep } = useTour()

  useEffect(() => {
    if (userRole !== 'athlete') return
    if (!isOpen || !setCurrentStep) return
    const idx = steps.findIndex((s) => s.selector === ROLE_TOGGLE_TOUR_SELECTOR)
    if (idx === -1 || currentStep !== idx) return
    setCurrentStep(idx + 1)
  }, [userRole, isOpen, currentStep, steps, setCurrentStep])

  return null
}

function CoachApp() {
  const { setIsOpen, setCurrentStep, setSteps, setDisabledActions, isOpen } = useTour()
  const [view, setView] = useState<View>('dashboard')
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null)
  const [diagnosticTargetId, setDiagnosticTargetId] = useState<string | null>(null)
  const [diagnosticSummary, setDiagnosticSummary] = useState<DiagnosticSummary | null>(null)
  const [welcomeVisible, setWelcomeVisible] = useState(() => !isIntroDismissed())
  /** Welcome “Start tour” includes team plan, one check-in, then this athlete’s training menu tour. */
  const [fullCoachTourFromWelcome, setFullCoachTourFromWelcome] = useState(false)
  /** Set when opening athlete detail from the post–check-in summary (`View … Training Menu`). */
  const pendingStudentDetailTourRef = useRef(false)
  /** Skip auto-closing the tour while the extended student-detail walkthrough is active. */
  const retainTourOnStudentDetailRef = useRef(false)
  /** Start Reactour only after welcome modal has unmounted so overlays never stack incorrectly. */
  const [pendingTourAfterIntro, setPendingTourAfterIntro] = useState(false)
  const selectAthlete = useFrontierStore((s) => s.selectAthlete)
  const builderTarget = useFrontierStore((s) => s.builderTarget)
  const setBuilderTarget = useFrontierStore((s) => s.setBuilderTarget)
  const athleteDiagnostic = useFrontierStore((s) => s.athleteDiagnostic)
  const getAthletesForSport = useFrontierStore((s) => s.getAthletesForSport)
  const selectedSport = useFrontierStore((s) => s.selectedSport)
  const sportPlans = useFrontierStore((s) => s.sportPlans)

  const diagnosticAthlete = diagnosticTargetId ? ATHLETE_BY_ID[diagnosticTargetId] : null

  /** First athlete on the builder sport roster who still needs diagnostic onboarding (team plan must exist). */
  const builderFirstUnOnboardedId = useMemo(() => {
    if (view !== 'builder' || !builderTarget || builderTarget.kind !== 'sport') return null
    const sport = builderTarget.sport
    if (!sportPlans[sport]) return null
    return getAthletesForSport(sport).find((a) => !athleteDiagnostic[a.id])?.id ?? null
  }, [view, builderTarget, sportPlans, getAthletesForSport, athleteDiagnostic])

  const remainingUnOnboarded = useMemo(() => {
    if (!diagnosticSummary) return []
    return getAthletesForSport(selectedSport).filter(
      (a) => a.id !== diagnosticSummary.athleteId && !athleteDiagnostic[a.id],
    )
  }, [diagnosticSummary, selectedSport, getAthletesForSport, athleteDiagnostic])

  /* ── Welcome modal actions ── */

  const startTour = useCallback(() => {
    persistIntroDismissed()
    setWelcomeVisible(false)
    setFullCoachTourFromWelcome(true)
    setPendingTourAfterIntro(true)
  }, [])

  const skipWelcome = useCallback(() => {
    persistIntroDismissed()
    setWelcomeVisible(false)
  }, [])

  const openIntro = useCallback(() => {
    setWelcomeVisible(true)
  }, [])

  useEffect(() => {
    if (view !== 'studentDetail') {
      retainTourOnStudentDetailRef.current = false
      return
    }
    setPendingTourAfterIntro(false)

    if (pendingStudentDetailTourRef.current) {
      pendingStudentDetailTourRef.current = false
      retainTourOnStudentDetailRef.current = true
      setSteps?.(studentDetailTourSteps)
      setCurrentStep?.(0)
      setDisabledActions?.(false)
      setIsOpen(true)
      return
    }

    if (retainTourOnStudentDetailRef.current) return

    setIsOpen(false)
  }, [view, setIsOpen, setSteps, setCurrentStep, setDisabledActions])

  useEffect(() => {
    if (diagnosticAthlete) {
      setIsOpen(false)
    }
  }, [diagnosticAthlete, setIsOpen])

  useEffect(() => {
    if (builderTarget?.kind === 'athlete') {
      setIsOpen(false)
    }
  }, [builderTarget, setIsOpen])

  useEffect(() => {
    if (!pendingTourAfterIntro || welcomeVisible) return
    setSteps?.([dashboardFirstStep(!!sportPlans[selectedSport])])
    setCurrentStep?.(0)
    setIsOpen(true)
    setPendingTourAfterIntro(false)
  }, [
    pendingTourAfterIntro,
    welcomeVisible,
    sportPlans,
    selectedSport,
    setCurrentStep,
    setIsOpen,
    setSteps,
  ])

  /**
   * Post–check-in summary: spotlight “View … Training Menu”.
   * Not gated on welcome “Start tour” — chain onboarding sets `fullCoachTourFromWelcome` false
   * but still shows “Continue with …”; coaches should see this hint whenever this modal appears.
   */
  useEffect(() => {
    if (!diagnosticSummary) return
    setSteps?.([diagnosticSummaryTrainingMenuStep])
    setCurrentStep?.(0)
    setIsOpen(true)
  }, [diagnosticSummary, setSteps, setCurrentStep, setIsOpen])

  const handleSportTourStageChange = useCallback(
    (stage: BuilderStage) => {
      if (!isOpen || view !== 'builder' || builderTarget?.kind !== 'sport') return
      if (stage === 'form') {
        setSteps?.(builderFormTourSteps)
        setCurrentStep?.(0)
      } else {
        const showProceedOnboarding = !!builderFirstUnOnboardedId
        setSteps?.(builderChatTourSteps(showProceedOnboarding))
        setCurrentStep?.(0)
      }
    },
    [
      isOpen,
      view,
      builderTarget,
      builderFirstUnOnboardedId,
      setSteps,
      setCurrentStep,
    ],
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
        if (!chain) setFullCoachTourFromWelcome(false)
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
    /** Same path as welcome “Start tour”: walk through student detail after post–check-in summary. */
    pendingStudentDetailTourRef.current = true
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

  const proceedToOnboardingFromTeamPlan = useCallback(() => {
    if (!builderFirstUnOnboardedId) return
    handleOnboardAthlete(builderFirstUnOnboardedId)
    setView('dashboard')
    setBuilderTarget(null)
    setActiveStudentId(null)
  }, [builderFirstUnOnboardedId, handleOnboardAthlete, setBuilderTarget])

  const openFineTuneFromDetail = useCallback(() => {
    if (!activeStudentId) return
    setBuilderTarget({ kind: 'athlete', athleteId: activeStudentId })
    setView('builder')
  }, [activeStudentId, setBuilderTarget])

  /* ── Manual replay ── */

  const replayDashboardTour = useCallback(() => {
    setFullCoachTourFromWelcome(false)
    pendingStudentDetailTourRef.current = false
    retainTourOnStudentDetailRef.current = false
    setSteps?.([dashboardFirstStep(!!sportPlans[selectedSport])])
    setCurrentStep?.(0)
    setIsOpen(true)
  }, [sportPlans, selectedSport, setSteps, setCurrentStep, setIsOpen])

  const showBuilder = view === 'builder' && !!builderTarget
  const showDetail = view === 'studentDetail' && !!activeStudentId

  return (
    <>
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
          tourSingleStudent={fullCoachTourFromWelcome}
          onContinue={() => handleChainNextOrDone(true)}
          onDone={() => handleChainNextOrDone(false)}
          onOpenDetail={handleOpenDetailFromSummary}
        />
      )}

      {/* Views */}
      {showBuilder ? (
        <BuilderView
          target={builderTarget!}
          coachTourOpen={isOpen}
          sportTourTailKey={builderFirstUnOnboardedId}
          onBack={backToDashboard}
          onProceedToOnboarding={
            builderFirstUnOnboardedId ? proceedToOnboardingFromTeamPlan : undefined
          }
          onSportTourStageChange={
            builderTarget!.kind === 'sport' ? handleSportTourStageChange : undefined
          }
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
          onOpenIntro={openIntro}
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
  tourSingleStudent,
  onContinue,
  onDone,
  onOpenDetail,
}: {
  summary: DiagnosticSummary
  nextName: string | null
  /** Full welcome tour: only onboard one athlete, then training menu — hide “continue with next”. */
  tourSingleStudent?: boolean
  onContinue: () => void
  onDone: () => void
  onOpenDetail: () => void
}) {
  const showChainContinue = nextName && !tourSingleStudent

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
        {tourSingleStudent ? (
          <p className="mt-3 text-[11px] leading-snug text-slate-400">
            Continue the tour: open their training menu below. (We&apos;ll do one athlete in this
            walkthrough.)
          </p>
        ) : null}
        <div className="mt-5 space-y-2">
          {showChainContinue ? (
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
            data-tour="diagnostic-summary-training-menu"
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
      <div className="flex max-h-[min(85vh,720px)] w-full max-w-md flex-col border border-border-subtle bg-surface-raised shadow-2xl shadow-alpha/10">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-6 md:px-8 md:pb-5 md:pt-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-alpha-light">
            Frontier OS
          </p>
          <p
            id="welcome-title"
            className="mt-1 text-xl font-bold tracking-tight text-white md:text-2xl"
          >
            Welcome
          </p>

          <section className="mt-5 space-y-4 text-sm leading-snug text-slate-400">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
                Skills connect like a ladder
              </h2>
              <p className="mt-1.5">
                Easy skills sit under harder ones. Hard games still give credit for the basics. You
                can see what each player still needs.
              </p>
            </div>
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
                Why players improve faster
              </h2>
              <p className="mt-1.5">
                Players move up only after they show they earned it. Practice tracks how tired they
                are. Mixed drills beat racing down a plain checklist.
              </p>
            </div>
          </section>

          <section className="mt-6 border-t border-border-subtle pt-5">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-300">
              Here&apos;s how to use this
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-snug text-slate-400">
              <li>Pick your sport.</li>
              <li>Tap Generate Team Plan. This creates a baseline blueprint: every player gets their own copy to start. Talk with the AI until the map fits how you coach.</li>
              <li>Run the short check-in quiz for each athlete.</li>
              <li>Optional: open one athlete and change only their map.</li>
              <li>Use the color team screen day to day. Open a player when you want drills or their map.</li>
              <li>
                Want the player view? Tap Athlete at the top. Tap Coach to come back.
              </li>
            </ol>
          </section>

          <p className="mt-5 text-xs text-slate-500">
            Start tour walks the team plan, one athlete check-in, then their training menu and
            player view (~12 min). Skip anytime with the tour arrows or X.
          </p>
        </div>

        <div className="shrink-0 border-t border-border-subtle px-6 py-4 md:px-8">
          <div className="space-y-2">
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
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
