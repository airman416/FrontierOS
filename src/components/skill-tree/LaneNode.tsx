import { memo } from 'react'
import { type Node, type NodeProps } from '@xyflow/react'

type LaneFlowNode = Node<{
  level: number
  width: number
  height: number
}, 'lane'>

const LANE_BG: Record<number, string> = {
  1: 'rgba(100, 116, 139, 0.05)',
  2: 'rgba(100, 116, 139, 0.05)',
  3: 'rgba(59, 130, 246, 0.05)',
  4: 'rgba(59, 130, 246, 0.05)',
  5: 'rgba(139, 92, 246, 0.05)',
  6: 'rgba(16, 185, 129, 0.05)',
}

const LANE_BORDER: Record<number, string> = {
  1: 'rgba(100, 116, 139, 0.1)',
  2: 'rgba(100, 116, 139, 0.1)',
  3: 'rgba(59, 130, 246, 0.1)',
  4: 'rgba(59, 130, 246, 0.1)',
  5: 'rgba(139, 92, 246, 0.1)',
  6: 'rgba(16, 185, 129, 0.1)',
}

export const LaneNode = memo(function LaneNode({ data }: NodeProps<LaneFlowNode>) {
  return (
    <div
      style={{
        width: data.width,
        height: data.height,
        backgroundColor: LANE_BG[data.level] ?? 'rgba(100, 116, 139, 0.05)',
        border: `1px solid ${LANE_BORDER[data.level] ?? 'rgba(100, 116, 139, 0.1)'}`,
        borderRadius: 8,
        pointerEvents: 'none',
      }}
    />
  )
})
