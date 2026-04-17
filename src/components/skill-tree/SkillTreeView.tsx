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
}: {
  selectedId: string | null
  onSelectNode: (id: string | null) => void
  skillDefs?: SkillDef[]
  /** When set, the tree renders per-athlete visuals (XP fill, conditional pips, review pulses). */
  athleteId?: string
}) {
  const selectedSport = useFrontierStore((s) => s.selectedSport)
  const getSkillsForSport = useFrontierStore((s) => s.getSkillsForSport)
  const storeSkillById = useFrontierStore((s) => s.skillById)
  const athleteMastery = useFrontierStore((s) => s.athleteMastery)
  const athleteReadiness = useFrontierStore((s) => s.athleteReadiness)
  const activeMastered = useFrontierStore((s) => s.mastered)
  const activeReadiness = useFrontierStore((s) => s.readinessScore)
  const scopedSkillById = useMemo(() => {
    if (!skillDefs) return null
    return Object.fromEntries(skillDefs.map((s) => [s.id, s]))
  }, [skillDefs])
  const skillById = scopedSkillById ?? storeSkillById
  const mastered = athleteId
    ? athleteMastery[athleteId] ?? new Set<string>()
    : activeMastered
  const readinessScore = athleteId
    ? athleteReadiness[athleteId] ?? 100
    : activeReadiness

  const rfRef = useRef<{ fitView: (opts?: { padding?: number; duration?: number }) => void } | null>(null)

  const defs = useMemo(
    () => skillDefs ?? getSkillsForSport(selectedSport),
    [skillDefs, getSkillsForSport, selectedSport],
  )

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => layoutSkillTree(defs, undefined, { athleteId }),
    [defs, athleteId],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges)

  useEffect(() => {
    const layout = layoutSkillTree(defs, undefined, { athleteId })
    setNodes(layout.nodes)
    setEdges(
      layout.edges.map((e) => {
        const { stroke, width, animated } = edgeStrokeForTarget(e.target, mastered, readinessScore, skillById)
        return { ...e, animated, style: { stroke, strokeWidth: width } }
      }),
    )
  }, [defs, athleteId, mastered, readinessScore, setNodes, setEdges, skillById])

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
