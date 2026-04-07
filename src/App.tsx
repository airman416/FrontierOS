import { useCallback, useState } from 'react'
import { EVENTS, Joyride, STATUS, type EventData } from 'react-joyride'
import { SkillTreeScreen } from './components/SkillTreeScreen'
import { TeamDashboard } from './components/TeamDashboard'
import { ATHLETES } from './data/athletes'
import {
  getDashboardTourSteps,
  getTreeTourSteps,
} from './onboarding/tourSteps'
import { useFrontierStore } from './store/useFrontierStore'

type View = 'dashboard' | 'skillmap'

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
  const [welcomeVisible, setWelcomeVisible] = useState(true)
  const [dashboardTourRun, setDashboardTourRun] = useState(false)
  const [treeTourRun, setTreeTourRun] = useState(false)
  const [isOnboarding, setIsOnboarding] = useState(false)
  const selectAthlete = useFrontierStore((s) => s.selectAthlete)

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
        selectAthlete(ATHLETES[0].id)
        setView('skillmap')
        setTimeout(() => setTreeTourRun(true), 500)
      }
    },
    [isOnboarding, selectAthlete],
  )

  /* ── Tree tour events ── */

  const onTreeTourEvent = useCallback((data: EventData) => {
    if (data.type !== EVENTS.TOUR_END) return
    if (data.status !== STATUS.FINISHED && data.status !== STATUS.SKIPPED)
      return
    setTreeTourRun(false)
    setIsOnboarding(false)
  }, [])

  /* ── Navigation ── */

  const handleSelectAthlete = useCallback(
    (id: string) => {
      selectAthlete(id)
      setView('skillmap')
    },
    [selectAthlete],
  )

  const backToDashboard = useCallback(() => {
    setTreeTourRun(false)
    setView('dashboard')
  }, [])

  /* ── Manual replay ── */

  const replayDashboardTour = useCallback(() => {
    setIsOnboarding(true)
    setDashboardTourRun(false)
    requestAnimationFrame(() => setDashboardTourRun(true))
  }, [])

  const replayTreeTour = useCallback(() => {
    setIsOnboarding(false)
    setTreeTourRun(false)
    requestAnimationFrame(() => setTreeTourRun(true))
  }, [])

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
          locale={{ last: 'Open skill map \u2192' }}
          options={JOYRIDE_OPTIONS}
        />
      )}

      {/* Skill map tour */}
      {view === 'skillmap' && (
        <Joyride
          key="phase-tree"
          run={treeTourRun}
          steps={getTreeTourSteps()}
          continuous
          scrollToFirstStep
          onEvent={onTreeTourEvent}
          options={JOYRIDE_OPTIONS}
        />
      )}

      {/* Welcome modal */}
      {welcomeVisible && (
        <WelcomeModal onStartTour={startTour} onSkip={skipWelcome} />
      )}

      {/* Views */}
      {view === 'dashboard' ? (
        <TeamDashboard
          onSelectAthlete={handleSelectAthlete}
          onReplayTour={replayDashboardTour}
        />
      ) : (
        <SkillTreeScreen
          onBack={backToDashboard}
          onReplayTour={replayTreeTour}
        />
      )}
    </>
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
          A guided tour walks through the roster, team heatmap, skill map, and
          every learning-science technique powering athlete development. Takes
          about two minutes.
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
