import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type NodeTypes,
  type NodeMouseHandler,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { SkillDef } from '../../data/graph'
import type { DeltaView, Divergence } from '../../lib/graphDelta'
import { layoutSkillTree } from '../../lib/skillTreeLayout'
import { computeVisualRole, useFrontierStore } from '../../store/useFrontierStore'
import { LaneNode } from './LaneNode'
import { LevelGroupNode } from './LevelGroupNode'
import { SkillGraphNode } from './SkillGraphNode'
import { SkillGraphScopeContext, type SkillGraphScope } from './SkillGraphScopeContext'

const nodeTypes: NodeTypes = { skill: SkillGraphNode, levelGroup: LevelGroupNode, lane: LaneNode }

function edgeStrokeForTarget(
  targetId: string,
  mastered: Set<string>,
  readiness: number,
  skillById: Record<string, SkillDef>,
): { stroke: string; width: number; animated: boolean } {
  const r = computeVisualRole(targetId, mastered, readiness, skillById)
  if (r === 'frontier') {
    return { stroke: '#3b82f6', width: 2.5, animated: true }
  }
  if (r === 'highRisk') {
    return { stroke: '#f59e0b', width: 2.5, animated: false }
  }
  return { stroke: '#334155', width: 1.5, animated: false }
}

export function SkillTreeView({
  selectedId,
  onSelectNode,
  skillDefs,
  athleteId,
  deltaView,
}: {
  selectedId: string | null
  onSelectNode: (id: string | null) => void
  skillDefs?: SkillDef[]
  /** When set, the tree renders per-athlete visuals (XP fill, conditional pips, review pulses). */
  athleteId?: string
  /** Optional divergence overlay vs the team baseline. When provided, nodes are
   * badged as added/tuned/removed and removed-skill ghosts are rendered. */
  deltaView?: DeltaView | null
}) {
  const selectedSport = useFrontierStore((s) => s.selectedSport)
  const getSkillsForSport = useFrontierStore((s) => s.getSkillsForSport)
  const storeSkillById = useFrontierStore((s) => s.skillById)
  const athleteMastery = useFrontierStore((s) => s.athleteMastery)
  const athleteReadiness = useFrontierStore((s) => s.athleteReadiness)
  const activeMastered = useFrontierStore((s) => s.mastered)
  const activeReadiness = useFrontierStore((s) => s.readinessScore)

  const rfRef = useRef<{ fitView: (opts?: { padding?: number; duration?: number }) => void } | null>(null)

  const baseDefs = useMemo(
    () => skillDefs ?? getSkillsForSport(selectedSport),
    [skillDefs, getSkillsForSport, selectedSport],
  )

  const defs: SkillDef[] = useMemo(() => {
    if (!deltaView || deltaView.removedGhosts.length === 0) return baseDefs
    const presentIds = new Set(baseDefs.map((s) => s.id))
    const ghosts = deltaView.removedGhosts
      .filter((g) => !presentIds.has(g.id))
      .map((g) => ({ ...g, prereqs: g.prereqs.filter((p) => presentIds.has(p)) }))
    return ghosts.length > 0 ? [...baseDefs, ...ghosts] : baseDefs
  }, [baseDefs, deltaView])

  const divergenceById = useMemo(() => {
    const map: Record<string, Divergence> = {}
    if (!deltaView) return map
    for (const id of deltaView.added) map[id] = 'added'
    for (const id of deltaView.modified) map[id] = 'modified'
    for (const id of deltaView.removedIds) map[id] = 'removed'
    return map
  }, [deltaView])

  const scopedSkillById = useMemo(() => {
    if (!skillDefs && !deltaView) return null
    return Object.fromEntries(defs.map((s) => [s.id, s]))
  }, [skillDefs, deltaView, defs])
  const skillById = scopedSkillById ?? storeSkillById
  const mastered = athleteId
    ? athleteMastery[athleteId] ?? new Set<string>()
    : activeMastered
  const readinessScore = athleteId
    ? athleteReadiness[athleteId] ?? 100
    : activeReadiness

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => layoutSkillTree(defs, undefined, { athleteId }),
    [defs, athleteId],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges)

  useEffect(() => {
    const layout = layoutSkillTree(defs, undefined, { athleteId })
    setNodes(
      layout.nodes.map((n) => {
        if (n.type !== 'skill') return n
        const divergence = divergenceById[n.id] ?? 'base'
        if (divergence === 'base') return n
        return {
          ...n,
          data: { ...(n.data as Record<string, unknown>), divergence },
        }
      }),
    )
    setEdges(
      layout.edges.map((e) => {
        const sourceRemoved = divergenceById[e.source] === 'removed'
        const targetRemoved = divergenceById[e.target] === 'removed'
        const isGhostEdge = sourceRemoved || targetRemoved
        if (isGhostEdge) {
          return {
            ...e,
            animated: false,
            style: {
              stroke: '#64748b',
              strokeWidth: 1.5,
              opacity: 0.35,
              strokeDasharray: '4 4',
            },
          }
        }
        const { stroke, width, animated } = edgeStrokeForTarget(e.target, mastered, readinessScore, skillById)
        return { ...e, animated, style: { stroke, strokeWidth: width } }
      }),
    )
  }, [defs, athleteId, mastered, readinessScore, setNodes, setEdges, skillById, divergenceById])

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === selectedId,
      })),
    )
  }, [selectedId, setNodes])

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === 'lane' || node.type === 'levelGroup') return
      onSelectNode(node.id)
    },
    [onSelectNode],
  )

  const onPaneClick = useCallback(() => {
    onSelectNode(null)
  }, [onSelectNode])

  const scope: SkillGraphScope | null = useMemo(
    () => (scopedSkillById ? { skillById: scopedSkillById } : null),
    [scopedSkillById],
  )

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
      <SkillGraphScopeContext.Provider value={scope}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onInit={(rf) => {
          rfRef.current = rf
          requestAnimationFrame(() => rf.fitView({ padding: 0.15, duration: 280 }))
        }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        fitView
        minZoom={0.35}
        maxZoom={1.85}
        className="bg-[#0c0d14]"
      >
        <Background gap={24} size={0.8} color="#1e2030" />
        <Controls showInteractive={false} className="!border !border-[#2e3348] !bg-[#111218] !shadow-xl [&>button]:!border-[#2e3348] [&>button]:!bg-[#111218] [&>button]:!fill-slate-400 [&>button:hover]:!bg-[#1e2030] [&>button:hover]:!fill-white" />
        <MiniMap
          className="!border !border-[#2e3348] !bg-[#111218] !shadow-xl"
          maskColor="rgb(10 11 16 / 0.7)"
          nodeColor={(n) => {
            if (n.id.startsWith('lane-')) return 'transparent'
            if (n.id.startsWith('level-group-')) return '#475569'
            const r = computeVisualRole(n.id, mastered, readinessScore, skillById)
            if (r === 'mastered') return '#10b981'
            if (r === 'frontier') return '#3b82f6'
            if (r === 'highRisk') return '#f59e0b'
            return '#475569'
          }}
          pannable
          zoomable
        />
      </ReactFlow>
      </SkillGraphScopeContext.Provider>
    </div>
  )
}
