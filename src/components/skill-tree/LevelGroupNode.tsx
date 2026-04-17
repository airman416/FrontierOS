import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { memo } from 'react'

type LevelGroupFlowNode = Node<{
  level: number
  count: number
  label: string
  skillLabels: string[]
}, 'levelGroup'>

const STRIP: Record<number, string> = {
  1: 'bg-slate-500',
  2: 'bg-slate-500',
  3: 'bg-blue-500',
  4: 'bg-blue-500',
  5: 'bg-violet-500',
  6: 'bg-emerald-500',
}

const BORDER: Record<number, string> = {
  1: 'border-slate-500/50',
  2: 'border-slate-500/50',
  3: 'border-blue-500/50',
  4: 'border-blue-500/50',
  5: 'border-violet-500/50',
  6: 'border-emerald-500/50',
}

export const LevelGroupNode = memo(function LevelGroupNode({ data }: NodeProps<LevelGroupFlowNode>) {
  return (
    <>
      <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-slate-600 !bg-slate-900" />
      <div
        className={`flex h-[72px] w-[220px] cursor-pointer overflow-hidden border-2 border-dashed ${BORDER[data.level] ?? 'border-slate-500/50'} bg-[#111218] shadow-lg shadow-black/30 transition-all hover:bg-[#181a24] hover:shadow-xl`}
        title={data.skillLabels.join('\n')}
      >
        <div className={`w-2 shrink-0 ${STRIP[data.level] ?? 'bg-slate-600'}`} aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col justify-center px-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Level {data.level} &middot; {data.label}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-slate-200">
            {data.count} skill{data.count !== 1 ? 's' : ''}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-600">Click to expand</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-slate-600 !bg-slate-900" />
    </>
  )
})
