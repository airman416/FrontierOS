import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { memo, useMemo } from 'react'
import { SKILL_BY_ID } from '../../data/graph'
import { computeVisualRole, useFrontierStore } from '../../store/useFrontierStore'

type SkillFlowNode = Node<Record<string, never>, 'skill'>

const strip: Record<string, string> = {
  locked: 'bg-slate-600',
  frontier: 'bg-blue-500',
  mastered: 'bg-emerald-500',
  highRisk: 'bg-amber-500',
}

const fill: Record<string, string> = {
  locked: 'bg-[#1a1c28]',
  frontier: 'bg-[#111827]',
  mastered: 'bg-[#0f1a16]',
  highRisk: 'bg-[#1a1710]',
}

export const SkillGraphNode = memo(function SkillGraphNode({ id, selected }: NodeProps<SkillFlowNode>) {
  const mastered = useFrontierStore((s) => s.mastered)
  const readinessScore = useFrontierStore((s) => s.readinessScore)
  const role = computeVisualRole(id, mastered, readinessScore)
  const def = SKILL_BY_ID[id]

  const levelDots = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => (
      <span
        key={i}
        className={`h-1.5 w-1.5 ${i < def.level ? 'bg-slate-300' : 'bg-slate-700'}`}
        aria-hidden
      />
    ))
  }, [def.level])

  return (
    <>
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-2 !border-slate-600 !bg-slate-900" />
      <div
        className={`flex h-[58px] w-[178px] overflow-hidden border border-[#2e3348] shadow-lg shadow-black/30 ${
          selected ? 'ring-2 ring-alpha ring-offset-1 ring-offset-[#0a0b10]' : ''
        } ${fill[role]}`}
      >
        <div className={`w-1.5 shrink-0 ${strip[role]}`} aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col justify-center px-2.5 py-1">
          <div className="mb-1 flex gap-0.5">{levelDots}</div>
          <p className="line-clamp-2 text-left text-[11px] font-semibold leading-tight text-slate-200">{def.label}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-2 !border-slate-600 !bg-slate-900" />
    </>
  )
})
