import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { memo, useMemo } from 'react'
import type { SkillDef } from '../../data/graph'
import { useBuildSkillById } from './BuilderView'
import type { Divergence } from './GraphPreview'

type SkillFlowNode = Node<{ selected?: boolean; divergence?: Divergence }, 'skill'>

const LEVEL_STRIP: Record<number, string> = {
  1: 'bg-slate-500',
  2: 'bg-slate-500',
  3: 'bg-blue-500',
  4: 'bg-blue-500',
  5: 'bg-violet-500',
  6: 'bg-emerald-500',
}

const LEVEL_FILL: Record<number, string> = {
  1: 'bg-[#1a1c28]',
  2: 'bg-[#1a1c28]',
  3: 'bg-[#111827]',
  4: 'bg-[#111827]',
  5: 'bg-[#1a1528]',
  6: 'bg-[#0f1a16]',
}

const DIVERGENCE_BADGE: Record<Exclude<Divergence, 'base'>, { label: string; classes: string }> = {
  added: { label: 'Added', classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  modified: { label: 'Tuned', classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  removed: { label: 'Removed', classes: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
}

export const PreviewSkillNode = memo(function PreviewSkillNode({ id, data }: NodeProps<SkillFlowNode>) {
  const skillById = useBuildSkillById()
  const def: SkillDef | undefined = skillById[id]
  const isSelected = data.selected === true
  const divergence: Divergence = data.divergence ?? 'base'

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

  const isRemoved = divergence === 'removed'
  const borderClass = isSelected
    ? 'border-alpha ring-1 ring-alpha/40'
    : divergence === 'added'
      ? 'border-emerald-500/60'
      : divergence === 'modified'
        ? 'border-amber-500/60'
        : divergence === 'removed'
          ? 'border-rose-500/40 border-dashed'
          : 'border-[#2e3348] hover:border-slate-500'

  const badge = divergence !== 'base' ? DIVERGENCE_BADGE[divergence] : null

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-2 !border-slate-600 !bg-slate-900"
      />
      <div
        className={`relative flex h-[58px] w-[178px] cursor-pointer overflow-hidden border shadow-lg shadow-black/30 transition-colors ${borderClass} ${
          LEVEL_FILL[def.level] ?? 'bg-[#1a1c28]'
        } ${isRemoved ? 'opacity-40' : ''}`}
      >
        <div
          className={`w-1.5 shrink-0 ${LEVEL_STRIP[def.level] ?? 'bg-slate-600'}`}
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col justify-center px-2.5 py-1">
          <div className="mb-1 flex gap-0.5">{levelDots}</div>
          <p
            className={`line-clamp-2 text-left text-[11px] font-semibold leading-tight text-slate-200 ${
              isRemoved ? 'line-through' : ''
            }`}
          >
            {def.label}
          </p>
        </div>
        {badge && (
          <span
            className={`pointer-events-none absolute right-1 top-1 border px-1 py-px text-[8px] font-bold uppercase tracking-wider ${badge.classes}`}
          >
            {badge.label}
          </span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-2 !border-slate-600 !bg-slate-900"
      />
    </>
  )
})
