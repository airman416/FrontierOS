import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { memo, useMemo } from 'react'
import type { Divergence } from '../../lib/graphDelta'
import { computeSkillVisualState, computeVisualRole, useFrontierStore, type VisualRole } from '../../store/useFrontierStore'
import { useSkillGraphScope } from './SkillGraphScopeContext'

export interface SkillFlowNodeData extends Record<string, unknown> {
  /** Optional per-athlete scope override — switches the node rendering into
   * student-detail mode (reads conditional/review/progress slices). */
  athleteId?: string
  /** Optional explicit progress override for preview-only surfaces. */
  progress?: number
  /** Optional divergence vs the team baseline (added/tuned/removed highlight). */
  divergence?: Divergence
}

const DIVERGENCE_BADGE: Record<Exclude<Divergence, 'base'>, { label: string; classes: string }> = {
  added: { label: 'Added', classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  modified: { label: 'Tuned', classes: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  removed: { label: 'Removed', classes: 'bg-rose-500/15 text-rose-300 border-rose-500/40' },
}

type SkillFlowNode = Node<SkillFlowNodeData, 'skill'>

const strip: Record<VisualRole, string> = {
  locked: 'bg-slate-600',
  frontier: 'bg-blue-500',
  mastered: 'bg-emerald-500',
  highRisk: 'bg-amber-500',
  conditional: 'bg-emerald-500',
  dueReview: 'bg-emerald-500',
}

const fill: Record<VisualRole, string> = {
  locked: 'bg-[#1a1c28]',
  frontier: 'bg-[#111827]',
  mastered: 'bg-[#0f1a16]',
  highRisk: 'bg-[#1a1710]',
  conditional: 'bg-[#0f1a16]',
  dueReview: 'bg-[#0f1a16]',
}

export const SkillGraphNode = memo(function SkillGraphNode({ id, selected, data }: NodeProps<SkillFlowNode>) {
  const mastered = useFrontierStore((s) => s.mastered)
  const readinessScore = useFrontierStore((s) => s.readinessScore)
  const storeSkillById = useFrontierStore((s) => s.skillById)
  const scope = useSkillGraphScope()
  const skillById = scope?.skillById ?? storeSkillById
  const athleteMastery = useFrontierStore((s) => s.athleteMastery)
  const athleteReadiness = useFrontierStore((s) => s.athleteReadiness)
  const athleteConditional = useFrontierStore((s) => s.athleteConditional)
  const athleteReviewState = useFrontierStore((s) => s.athleteReviewState)
  const athleteSkillProgress = useFrontierStore((s) => s.athleteSkillProgress)

  const athleteId = data?.athleteId
  const scopedMastered = athleteId
    ? athleteMastery[athleteId] ?? new Set<string>()
    : mastered
  const scopedReadiness = athleteId
    ? athleteReadiness[athleteId] ?? 100
    : readinessScore
  const scopedConditional = athleteId ? athleteConditional[athleteId] : undefined
  const scopedReviewState = athleteId ? athleteReviewState[athleteId] : undefined
  const scopedProgress = athleteId
    ? athleteSkillProgress[athleteId]?.[id]
    : undefined
  const explicitProgress = data?.progress

  const role: VisualRole = athleteId
    ? computeSkillVisualState({
        skillId: id,
        mastered: scopedMastered,
        readinessScore: scopedReadiness,
        skillById,
        conditional: scopedConditional,
        reviewState: scopedReviewState,
      })
    : computeVisualRole(id, scopedMastered, scopedReadiness, skillById)

  const def = skillById[id]
  const isConditional = role === 'conditional'
  const isDueReview = role === 'dueReview'
  const isFrontier = role === 'frontier'
  const divergence: Divergence = data?.divergence ?? 'base'
  const isRemoved = divergence === 'removed'
  const divergenceBadge = divergence !== 'base' ? DIVERGENCE_BADGE[divergence] : null

  const progressPct = isFrontier
    ? Math.max(0, Math.min(100, explicitProgress ?? scopedProgress ?? 0))
    : 0

  const levelDots = useMemo(() => {
    if (!def) return null
    return Array.from({ length: 6 }, (_, i) => (
      <span
        key={i}
        className={`h-1.5 w-1.5 ${i < def.level ? 'bg-slate-300' : 'bg-slate-700'}`}
        aria-hidden
      />
    ))
  }, [def])

  if (!def) return null

  const borderClass =
    divergence === 'added'
      ? 'border-emerald-500/70'
      : divergence === 'modified'
        ? 'border-amber-500/70'
        : divergence === 'removed'
          ? 'border-rose-500/50 border-dashed'
          : isConditional
            ? 'border-emerald-500/60 border-dashed'
            : 'border-[#2e3348]'

  return (
    <>
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-2 !border-slate-600 !bg-slate-900" />
      <div
        className={`relative flex h-[58px] w-[178px] overflow-hidden border shadow-lg shadow-black/30 ${
          selected ? 'ring-2 ring-alpha ring-offset-1 ring-offset-[#0a0b10]' : ''
        } ${borderClass} ${fill[role]} ${isRemoved ? 'opacity-40' : ''}`}
      >
        <div className={`w-1.5 shrink-0 ${strip[role]}`} aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col justify-center px-2.5 py-1">
          <div className="mb-1 flex items-center justify-between gap-1">
            <div className="flex gap-0.5">{levelDots}</div>
            {isConditional && (
              <span
                className="h-1.5 w-1.5 shrink-0 bg-amber-400"
                title="Conditionally mastered"
                aria-label="Conditionally mastered"
              />
            )}
            {isDueReview && (
              <span
                className="h-1.5 w-1.5 shrink-0 animate-pulse bg-amber-400"
                title="Due for review"
                aria-label="Due for review"
              />
            )}
          </div>
          <p
            className={`line-clamp-2 text-left text-[11px] font-semibold leading-tight text-slate-200 ${
              isRemoved ? 'line-through' : ''
            }`}
          >
            {def.label}
          </p>
        </div>
        {isFrontier && progressPct > 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-blue-500/70"
            style={{ width: `${progressPct}%` }}
            aria-hidden
          />
        )}
        {divergenceBadge && (
          <span
            className={`pointer-events-none absolute right-1 top-1 border px-1 py-px text-[8px] font-bold uppercase tracking-wider ${divergenceBadge.classes}`}
          >
            {divergenceBadge.label}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-2 !border-slate-600 !bg-slate-900" />
    </>
  )
})
