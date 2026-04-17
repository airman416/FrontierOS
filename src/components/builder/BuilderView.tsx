import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { SkillDef, Sport } from '../../data/graph'
import { ATHLETE_BY_ID } from '../../data/athletes'
import { generateGraph } from '../../lib/generateApi'
import type {
  AthleteContext,
  ChatMessage,
  GenerateMode,
  GeneratedGraph,
  GraphDelta,
  SportPlan,
} from '../../lib/graphSchema'
import { computeDelta, deltaViewFromDelta, hasDeltaChanges } from '../../lib/graphDelta'
import { useFrontierStore, type BuilderTarget } from '../../store/useFrontierStore'
import { ChatPanel } from './ChatPanel'
import { GraphPreview, type DeltaView } from './GraphPreview'
import { NodeDetailPanel } from './NodeDetailPanel'
import { RequirementsInput } from './RequirementsInput'

const SkillByIdContext = createContext<Record<string, SkillDef>>({})
export function useBuildSkillById() {
  return useContext(SkillByIdContext)
}

type Stage = 'form' | 'chat'

function sportLabel(sport: string): string {
  return sport.charAt(0).toUpperCase() + sport.slice(1)
}

export function BuilderView({
  target,
  onBack,
}: {
  target: BuilderTarget
  onBack: () => void
}) {
  const isSportMode = target.kind === 'sport'
  const athleteId = target.kind === 'athlete' ? target.athleteId : null
  const athlete = athleteId ? ATHLETE_BY_ID[athleteId] : null

  const sport: Sport | string = isSportMode
    ? target.sport
    : athlete?.sport ?? 'baseball'

  const sportLabelStr = sportLabel(String(sport))

  const saveAthleteGraph = useFrontierStore((s) => s.saveAthleteGraph)
  const saveSportPlan = useFrontierStore((s) => s.saveSportPlan)
  const saveAthleteDraftDelta = useFrontierStore((s) => s.saveAthleteDraftDelta)
  const acceptAthleteDraft = useFrontierStore((s) => s.acceptAthleteDraft)
  const discardAthleteDraft = useFrontierStore((s) => s.discardAthleteDraft)
  const resetAthleteDelta = useFrontierStore((s) => s.resetAthleteDelta)
  const clearSportPlan = useFrontierStore((s) => s.clearSportPlan)
  const getResolvedAthleteGraph = useFrontierStore((s) => s.getResolvedAthleteGraph)
  const getDraftResolvedAthleteGraph = useFrontierStore((s) => s.getDraftResolvedAthleteGraph)
  const athleteMastery = useFrontierStore((s) => s.athleteMastery)
  const athleteReadiness = useFrontierStore((s) => s.athleteReadiness)
  const getAthletesForSport = useFrontierStore((s) => s.getAthletesForSport)

  // Subscribe to the raw maps so the header reactively reflects accept/discard.
  const sportPlansMap = useFrontierStore((s) => s.sportPlans)
  const athleteDeltasMap = useFrontierStore((s) => s.athleteGraphDeltas)
  const athleteDraftDeltasMap = useFrontierStore((s) => s.athleteGraphDraftDeltas)
  const athleteGraphsMap = useFrontierStore((s) => s.athleteGraphs)

  const existingSportPlan: SportPlan | null = useMemo(
    () => sportPlansMap[String(sport)] ?? null,
    [sportPlansMap, sport],
  )
  const existingDelta = useMemo(
    () => (athleteId ? athleteDeltasMap[athleteId] ?? null : null),
    [athleteId, athleteDeltasMap],
  )
  const existingDraft = useMemo(
    () => (athleteId ? athleteDraftDeltasMap[athleteId] ?? null : null),
    [athleteId, athleteDraftDeltasMap],
  )
  const legacyAthleteGraph = useMemo(
    () => (athleteId ? athleteGraphsMap[athleteId] ?? null : null),
    [athleteId, athleteGraphsMap],
  )
  const draftResolvedAthleteGraph = useMemo(
    () => (athleteId ? getDraftResolvedAthleteGraph(athleteId) : null),
    [
      athleteId,
      getDraftResolvedAthleteGraph,
      // Recompute when any of the underlying maps change.
      sportPlansMap,
      athleteDeltasMap,
      athleteDraftDeltasMap,
      athleteGraphsMap,
    ],
  )

  const initialGraph: GeneratedGraph | null = isSportMode
    ? existingSportPlan?.graph ?? null
    : draftResolvedAthleteGraph

  const workingDelta: GraphDelta | null = existingDraft ?? existingDelta ?? null

  const initialHistory: ChatMessage[] = isSportMode
    ? existingSportPlan?.history ?? []
    : workingDelta?.history ?? []

  const initialRequirements: string = isSportMode
    ? existingSportPlan?.requirements ?? ''
    : workingDelta?.requirements ?? ''

  const [stage, setStage] = useState<Stage>(initialGraph ? 'chat' : 'form')
  const [requirements, setRequirements] = useState(initialRequirements)
  const [messages, setMessages] = useState<ChatMessage[]>(initialHistory)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentGraph, setCurrentGraph] = useState<GeneratedGraph | null>(initialGraph)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const previewSkillById = useMemo(() => {
    if (!currentGraph) return {}
    return Object.fromEntries(currentGraph.skills.map((s) => [s.id, s]))
  }, [currentGraph])

  const baseGraph: GeneratedGraph | null = isSportMode ? null : existingSportPlan?.graph ?? null

  const deltaView: DeltaView | null = useMemo(() => {
    if (isSportMode) return null
    if (!baseGraph || !currentGraph) return null
    const delta = computeDelta(baseGraph, currentGraph)
    const view = deltaViewFromDelta(delta)
    const baseById = new Map(baseGraph.skills.map((s) => [s.id, s]))
    const removedGhosts: SkillDef[] = []
    for (const id of view.removed) {
      const g = baseById.get(id)
      if (g) removedGhosts.push(g)
    }
    return {
      added: view.added,
      modified: view.modified,
      removedIds: view.removed,
      removedGhosts,
    }
  }, [isSportMode, baseGraph, currentGraph])

  const divergenceCount = deltaView
    ? deltaView.added.size + deltaView.modified.size + deltaView.removedIds.size
    : 0

  const hasPendingDraft = !isSportMode && !!existingDraft

  const persistResult = useCallback(
    (nextGraph: GeneratedGraph, nextHistory: ChatMessage[], nextRequirements: string) => {
      if (isSportMode) {
        const plan: SportPlan = {
          sport,
          graph: nextGraph,
          version: `${Date.now()}`,
          requirements: nextRequirements,
          history: nextHistory,
          updatedAt: Date.now(),
        }
        saveSportPlan(sport, plan)
        return
      }
      if (!athleteId) return
      if (baseGraph) {
        const delta: GraphDelta = computeDelta(baseGraph, nextGraph)
        delta.requirements = nextRequirements
        delta.history = nextHistory
        delta.baseVersion = existingSportPlan?.version
        // Athlete fine-tunes land in a draft layer until the coach explicitly
        // accepts them. Until then, the athlete's training menu continues to
        // use the previously-accepted delta (or the team baseline).
        saveAthleteDraftDelta(athleteId, delta)
      } else {
        saveAthleteGraph(athleteId, nextGraph)
      }
    },
    [
      isSportMode,
      sport,
      athleteId,
      baseGraph,
      existingSportPlan?.version,
      saveSportPlan,
      saveAthleteDraftDelta,
      saveAthleteGraph,
    ],
  )

  const athleteContextForApi: AthleteContext | undefined = useMemo(() => {
    if (isSportMode || !athlete) return undefined
    const mastered = athleteMastery[athlete.id]
    const readiness = athleteReadiness[athlete.id]
    return {
      name: athlete.displayName,
      firstName: athlete.firstName,
      position: athlete.position,
      schoolYear: athlete.schoolYear,
      age: athlete.age,
      tagline: athlete.tagline,
      masteredIds: mastered ? [...mastered] : undefined,
      readiness,
    }
  }, [isSportMode, athlete, athleteMastery, athleteReadiness])

  const sendMessage = useCallback(
    async (userMessage: string, history: ChatMessage[], effectiveRequirements: string) => {
      const newHistory: ChatMessage[] = [...history, { role: 'user', content: userMessage }]
      setMessages(newHistory)
      setIsLoading(true)
      setError(null)

      try {
        const mode: GenerateMode = isSportMode ? 'sport' : 'athlete'
        const response = await generateGraph({
          mode,
          sport: String(sport),
          requirements: effectiveRequirements,
          history: newHistory,
          currentGraph: currentGraph?.skills,
          baseGraph: !isSportMode && baseGraph ? baseGraph.skills : undefined,
          athleteContext: athleteContextForApi,
        })

        const nextHistory: ChatMessage[] = [
          ...newHistory,
          { role: 'assistant', content: response.chatReply },
        ]
        setCurrentGraph(response.graph)
        setMessages(nextHistory)
        persistResult(response.graph, nextHistory, effectiveRequirements)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong'
        setError(msg)
        setMessages([
          ...newHistory,
          { role: 'assistant', content: `Error: ${msg}. Please try again.` },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [
      isSportMode,
      sport,
      currentGraph,
      baseGraph,
      athleteContextForApi,
      persistResult,
    ],
  )

  const handleGenerate = useCallback(async () => {
    setStage('chat')
    const trimmed = requirements.trim()
    let prompt: string
    if (isSportMode) {
      prompt = trimmed
        ? `Generate a complete team-wide ${sport} knowledge graph. My requirements: ${trimmed}`
        : `Generate a complete team-wide ${sport} knowledge graph with sensible defaults.`
    } else {
      const name = athlete?.displayName ?? 'this athlete'
      if (baseGraph) {
        prompt = trimmed
          ? `Starting from the team baseline for ${sport}, tune the plan for ${name}. Adjustments: ${trimmed}`
          : `Starting from the team baseline for ${sport}, confirm the plan is appropriate for ${name} and only adjust what needs to differ for them. If nothing needs to change, return the baseline as-is.`
      } else {
        prompt = trimmed
          ? `Generate a complete ${sport} knowledge graph for ${name}. My requirements: ${trimmed}`
          : `Generate a complete ${sport} knowledge graph for ${name} with sensible defaults.`
      }
    }
    await sendMessage(prompt, [], trimmed)
  }, [requirements, isSportMode, sport, athlete?.displayName, baseGraph, sendMessage])

  const handleChatSend = useCallback(
    (message: string) => {
      sendMessage(message, messages, requirements)
    },
    [messages, sendMessage, requirements],
  )

  const handleBackToForm = useCallback(() => {
    setStage('form')
  }, [])

  const handleResetToTeamPlan = useCallback(() => {
    if (!athleteId || !baseGraph) return
    const confirmed = window.confirm(
      `Discard ${athlete?.firstName ?? 'this athlete'}'s fine-tuned adjustments and revert to the team plan? This cannot be undone.`,
    )
    if (!confirmed) return
    resetAthleteDelta(athleteId)
    setCurrentGraph(baseGraph)
    setMessages([])
    setRequirements('')
  }, [athleteId, baseGraph, resetAthleteDelta, athlete?.firstName])

  const handleAcceptDraft = useCallback(() => {
    if (!athleteId) return
    acceptAthleteDraft(athleteId)
  }, [athleteId, acceptAthleteDraft])

  const handleDiscardDraft = useCallback(() => {
    if (!athleteId) return
    const confirmed = window.confirm(
      `Discard the pending fine-tune draft for ${athlete?.firstName ?? 'this athlete'}? The training menu will stay on the last accepted plan.`,
    )
    if (!confirmed) return
    discardAthleteDraft(athleteId)
    // Revert the preview back to the last-accepted state for this athlete.
    const resolved = getResolvedAthleteGraph(athleteId)
    setCurrentGraph(resolved ?? baseGraph)
    setMessages(existingDelta?.history ?? [])
    setRequirements(existingDelta?.requirements ?? '')
  }, [
    athleteId,
    athlete?.firstName,
    discardAthleteDraft,
    getResolvedAthleteGraph,
    baseGraph,
    existingDelta,
  ])

  const handleScrapTeamPlan = useCallback(() => {
    if (!isSportMode) return
    const athletesAffected = getAthletesForSport(String(sport)).length
    const confirmed = window.confirm(
      `Scrap the ${sportLabelStr} team plan and start from scratch?\n\n` +
        `This will delete the team baseline and wipe every per-athlete fine-tune ` +
        `for ${sportLabelStr} (${athletesAffected} athlete${athletesAffected === 1 ? '' : 's'}). ` +
        `This cannot be undone.`,
    )
    if (!confirmed) return
    clearSportPlan(sport)
    setCurrentGraph(null)
    setMessages([])
    setRequirements('')
    setSelectedNodeId(null)
    setError(null)
    setStage('form')
  }, [isSportMode, sport, sportLabelStr, clearSportPlan, getAthletesForSport])

  useEffect(() => {
    if (stage !== 'form') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleGenerate()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [stage, handleGenerate])

  const headerTitle = isSportMode
    ? `${sportLabelStr} — Team Plan`
    : `${athlete?.displayName ?? 'Athlete'} — Plan Builder`

  const headerSubtitle = isSportMode
    ? existingSportPlan
      ? 'Editing the team baseline for every athlete on this sport.'
      : 'Build the team baseline that seeds every athlete on this sport.'
    : baseGraph
      ? hasPendingDraft
        ? 'Fine-tune draft — accept to push it to the training menu.'
        : 'Fine-tuning on top of the team plan. Only changes diverge.'
      : legacyAthleteGraph
        ? 'Legacy athlete plan — will convert to the team plan layer on next save.'
        : 'Generate a standalone plan for this athlete.'

  const requirementsLabel = isSportMode ? 'Team-wide requirements' : 'Per-athlete adjustments'
  const requirementsPlaceholder = isSportMode
    ? 'e.g., I care a ton about elbow reinforcement, every athlete does carnivore, pre-season emphasis on defensive fundamentals…'
    : `e.g., Emphasize rotator cuff prehab, swap out plyos for low-impact alternatives, focus on mental toughness…`

  if (stage === 'form') {
    return (
      <div className="min-h-[100dvh] bg-[#0a0b10]">
        <header className="border-b border-border-subtle bg-surface px-4 pt-5 pb-4 md:px-6">
          <div className="mx-auto max-w-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-alpha-light">
                  Frontier OS
                </p>
                <h1 className="mt-0.5 text-xl font-bold tracking-tight text-white">
                  {headerTitle}
                </h1>
                <p className="mt-1 text-xs text-slate-500">
                  {isSportMode
                    ? `${sportLabelStr} · team baseline`
                    : `${sportLabelStr} · ${athlete?.position ?? 'Athlete'}`}
                </p>
              </div>
              <button
                type="button"
                onClick={onBack}
                className="shrink-0 border border-border-subtle bg-surface-raised px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-border-default hover:text-white"
              >
                &larr; Dashboard
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-xl px-4 py-8 md:px-6">
          <div className="border border-border-subtle bg-surface-raised p-6">
            <h2 className="text-lg font-bold text-white">
              {isSportMode ? 'Set your team-wide preferences' : 'Describe the athlete adjustments'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {isSportMode
                ? `The AI will generate a complete ${sportLabelStr.toLowerCase()} knowledge graph, shared across every athlete on the team.`
                : baseGraph
                  ? `The AI will start from your ${sportLabelStr.toLowerCase()} team plan and only adjust what should differ for ${athlete?.firstName ?? 'this athlete'}.`
                  : `The AI will generate a full ${sportLabelStr.toLowerCase()} plan for ${athlete?.firstName ?? 'this athlete'} (no team plan to inherit from yet).`}
            </p>

            <div className="mt-6">
              <RequirementsInput
                value={requirements}
                onChange={setRequirements}
                label={requirementsLabel}
                placeholder={requirementsPlaceholder}
              />
            </div>

            {error && (
              <p className="mt-3 text-xs text-rose-400">{error}</p>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              className="mt-6 w-full bg-alpha py-3 text-sm font-bold text-white transition hover:bg-alpha-light disabled:opacity-40"
            >
              {isSportMode ? 'Generate Team Plan' : 'Generate Athlete Plan'} →
              <span className="ml-2 text-[11px] font-normal opacity-50">⌘↵</span>
            </button>
            <p className="mt-3 text-center text-[11px] text-slate-600">
              You'll be able to iterate with AI after generation.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <SkillByIdContext.Provider value={previewSkillById}>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#0a0b10]">
        <header className="flex shrink-0 items-center gap-3 border-b border-border-subtle bg-surface px-3 py-2.5 md:gap-4 md:px-4">
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 border border-border-subtle bg-surface-raised px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-border-default hover:text-white"
          >
            &larr; Dashboard
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-white">
                {headerTitle}
              </p>
              <span
                className={`shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                  isSportMode
                    ? 'bg-alpha/15 text-alpha-light'
                    : 'bg-amber-500/15 text-amber-300'
                }`}
              >
                {isSportMode ? 'Team Plan' : 'Athlete Fine-Tune'}
              </span>
              {!isSportMode && divergenceCount > 0 && (
                <span className="shrink-0 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-amber-300">
                  {divergenceCount} diverge{divergenceCount === 1 ? '' : 's'}
                </span>
              )}
              {hasPendingDraft && (
                <span
                  className="shrink-0 border border-sky-500/40 bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-sky-300"
                  title="These changes are a draft and haven't been pushed to the athlete's training menu yet."
                >
                  Pending accept
                </span>
              )}
            </div>
            <p className="truncate text-[11px] text-slate-500">
              {headerSubtitle}
              {currentGraph && (
                <span className="ml-2 text-slate-600">· {currentGraph.skills.length} nodes</span>
              )}
            </p>
          </div>
          {hasPendingDraft && (
            <>
              <button
                type="button"
                onClick={handleAcceptDraft}
                title="Push this fine-tuned plan to the athlete's training menu"
                className="shrink-0 border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 transition hover:border-emerald-500/70 hover:bg-emerald-500/20 hover:text-emerald-200"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={handleDiscardDraft}
                title="Throw away the pending draft and keep the last accepted plan"
                className="shrink-0 border border-border-subtle bg-surface-raised px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300 transition hover:border-border-default hover:text-white"
              >
                Discard Draft
              </button>
            </>
          )}
          {!isSportMode && baseGraph && (
            <button
              type="button"
              onClick={handleResetToTeamPlan}
              disabled={
                !hasDeltaChanges(existingDelta) && !hasDeltaChanges(existingDraft)
              }
              title={
                hasDeltaChanges(existingDelta) || hasDeltaChanges(existingDraft)
                  ? 'Revert this athlete to the team plan'
                  : 'Already matches the team plan'
              }
              className="shrink-0 border border-border-subtle bg-surface-raised px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300 transition hover:border-border-default hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Reset to Team Plan
            </button>
          )}
          {isSportMode && existingSportPlan && (
            <button
              type="button"
              onClick={handleScrapTeamPlan}
              title="Delete the team plan and all per-athlete fine-tunes, then start from scratch"
              className="shrink-0 border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-rose-300 transition hover:border-rose-500/60 hover:bg-rose-500/20 hover:text-rose-200"
            >
              Scrap &amp; Restart
            </button>
          )}
          {!currentGraph && (
            <button
              type="button"
              onClick={handleBackToForm}
              className="shrink-0 border border-border-subtle bg-surface-raised px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300 transition hover:border-border-default hover:text-white"
            >
              Edit Requirements
            </button>
          )}
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="flex h-[40vh] w-full shrink-0 flex-col border-b border-border-subtle lg:h-auto lg:w-[380px] lg:border-b-0 lg:border-r">
            <ChatPanel
              messages={messages}
              onSend={handleChatSend}
              isLoading={isLoading}
              placeholder={
                isSportMode
                  ? 'Iterate on the team plan…'
                  : 'Adjust this athlete relative to the team plan…'
              }
            />
          </div>

          <div className="relative min-h-0 flex-1">
            {currentGraph && currentGraph.skills.length > 0 ? (
              <GraphPreview
                skills={currentGraph.skills}
                selectedNodeId={selectedNodeId}
                onNodeSelect={setSelectedNodeId}
                deltaView={deltaView}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto grid h-12 w-12 grid-cols-2 gap-1">
                    <span className="animate-pulse bg-alpha/20" />
                    <span className="animate-pulse bg-alpha/10 [animation-delay:100ms]" />
                    <span className="animate-pulse bg-alpha/10 [animation-delay:200ms]" />
                    <span className="animate-pulse bg-alpha/20 [animation-delay:300ms]" />
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {isLoading ? 'Generating your knowledge graph...' : 'Graph will appear here'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {selectedNodeId && currentGraph && (
            <NodeDetailPanel
              skill={currentGraph.skills.find((s) => s.id === selectedNodeId)!}
              allSkills={currentGraph.skills}
              onClose={() => setSelectedNodeId(null)}
            />
          )}
        </div>
      </div>
    </SkillByIdContext.Provider>
  )
}
