import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type NodeTypes,
  type NodeMouseHandler,
  type Node as RFNode,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo } from 'react'
import type { SkillDef } from '../../data/graph'
import { layoutSkillTree } from '../../lib/skillTreeLayout'
import { LaneNode } from '../skill-tree/LaneNode'
import { LevelGroupNode } from '../skill-tree/LevelGroupNode'
import { PreviewSkillNode } from './PreviewSkillNode'

const nodeTypes: NodeTypes = { skill: PreviewSkillNode, levelGroup: LevelGroupNode, lane: LaneNode }

type FitViewOpts = {
  padding?: number
  duration?: number
  nodes?: Pick<RFNode, 'id'>[]
  maxZoom?: number
  minZoom?: number
}

const LEVEL_COLORS: Record<number, string> = {
  1: '#64748b',
  2: '#64748b',
  3: '#3b82f6',
  4: '#3b82f6',
  5: '#8b5cf6',
  6: '#10b981',
}

export type Divergence = 'added' | 'modified' | 'removed' | 'base'

export interface DeltaView {
  added: Set<string>
  modified: Set<string>
  removedIds: Set<string>
  removedGhosts: SkillDef[]
}

export function GraphPreview({
  skills,
  selectedNodeId,
  onNodeSelect,
  deltaView,
}: {
  skills: SkillDef[]
  selectedNodeId: string | null
  onNodeSelect: (id: string | null) => void
  deltaView?: DeltaView | null
}) {
  const layoutSkills: SkillDef[] = useMemo(() => {
    if (!deltaView || deltaView.removedGhosts.length === 0) return skills
    const presentIds = new Set(skills.map((s) => s.id))
    const ghostSkills = deltaView.removedGhosts.map((g) => ({
      ...g,
      prereqs: g.prereqs.filter((p) => presentIds.has(p)),
    }))
    return [...skills, ...ghostSkills]
  }, [skills, deltaView])

  const divergenceById = useMemo(() => {
    const map: Record<string, Divergence> = {}
    if (!deltaView) return map
    for (const id of deltaView.added) map[id] = 'added'
    for (const id of deltaView.modified) map[id] = 'modified'
    for (const id of deltaView.removedIds) map[id] = 'removed'
    return map
  }, [deltaView])

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => layoutSkillTree(layoutSkills),
    [layoutSkills],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges)

  useEffect(() => {
    const layout = layoutSkillTree(layoutSkills)
    setNodes(
      layout.nodes.map((n) => {
        const divergence: Divergence = divergenceById[n.id] ?? 'base'
        return {
          ...n,
          data: {
            ...n.data,
            selected: n.id === selectedNodeId,
            divergence,
          },
        }
      }),
    )

    const skillById = Object.fromEntries(layoutSkills.map((s) => [s.id, s]))
    setEdges(
      layout.edges.map((e) => {
        const targetLevel = skillById[e.target]?.level ?? 1
        const sourceIsRemoved = divergenceById[e.source] === 'removed'
        const targetIsRemoved = divergenceById[e.target] === 'removed'
        const isGhostEdge = sourceIsRemoved || targetIsRemoved
        return {
          ...e,
          style: {
            stroke: LEVEL_COLORS[targetLevel] ?? '#334155',
            strokeWidth: 2,
            opacity: isGhostEdge ? 0.25 : 1,
            strokeDasharray: isGhostEdge ? '4 4' : undefined,
          },
        }
      }),
    )
  }, [layoutSkills, selectedNodeId, setNodes, setEdges, divergenceById])

  const fitViewOnRoots = useCallback(
    (rf: { fitView: (opts?: FitViewOpts) => void }) => {
      if (layoutSkills.length === 0) {
        rf.fitView({ padding: 0.15, duration: 0 })
        return
      }
      const minLevel = Math.min(...layoutSkills.map((s) => s.level))
      const rootIds = new Set(
        layoutSkills.filter((s) => s.level === minLevel).map((s) => s.id),
      )
      const rootNodes = layoutNodes.filter((n) => rootIds.has(n.id))
      if (rootNodes.length > 0) {
        rf.fitView({ nodes: rootNodes, padding: 0.6, duration: 0, maxZoom: 1.2 })
      } else {
        rf.fitView({ padding: 0.15, duration: 0 })
      }
    },
    [layoutSkills, layoutNodes],
  )

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === 'lane' || node.type === 'levelGroup') return
      onNodeSelect(node.id === selectedNodeId ? null : node.id)
    },
    [onNodeSelect, selectedNodeId],
  )

  const handlePaneClick = useCallback(() => {
    onNodeSelect(null)
  }, [onNodeSelect])

  return (
    <div className="relative h-full w-full">
      {deltaView && (
        <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-2 border border-[#2e3348] bg-[#111218]/90 px-2.5 py-1.5 text-[10px] font-semibold text-slate-400 shadow-lg backdrop-blur">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 bg-emerald-500" />
            <span className="text-emerald-300">Added {deltaView.added.size}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 bg-amber-500" />
            <span className="text-amber-300">Tuned {deltaView.modified.size}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 bg-rose-500/60" />
            <span className="text-rose-300">Removed {deltaView.removedIds.size}</span>
          </span>
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onInit={(rf) => {
          requestAnimationFrame(() => fitViewOnRoots(rf))
        }}
        nodesDraggable={false}
        nodesConnectable={false}
        minZoom={0.2}
        maxZoom={1.85}
        className="bg-[#0c0d14]"
      >
        <Background gap={24} size={0.8} color="#1e2030" />
        <Controls
          showInteractive={false}
          className="!border !border-[#2e3348] !bg-[#111218] !shadow-xl [&>button]:!border-[#2e3348] [&>button]:!bg-[#111218] [&>button]:!fill-slate-400 [&>button:hover]:!bg-[#1e2030] [&>button:hover]:!fill-white"
        />
        <MiniMap
          className="!border !border-[#2e3348] !bg-[#111218] !shadow-xl"
          maskColor="rgb(10 11 16 / 0.7)"
          nodeColor={(n) => {
            if (n.id.startsWith('lane-')) return 'transparent'
            if (n.id.startsWith('level-group-')) {
              const level = parseInt(n.id.split('-')[2], 10)
              return LEVEL_COLORS[level] ?? '#475569'
            }
            const skill = layoutSkills.find((s) => s.id === n.id)
            return LEVEL_COLORS[skill?.level ?? 1] ?? '#475569'
          }}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  )
}
