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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SkillDef } from '../../data/graph'
import { layoutSkillTree } from '../../lib/skillTreeLayout'
import { computeVisualRole, useFrontierStore } from '../../store/useFrontierStore'
import { LaneNode } from './LaneNode'
import { LevelGroupNode } from './LevelGroupNode'
import { SkillGraphNode } from './SkillGraphNode'

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
}: {
  selectedId: string | null
  onSelectNode: (id: string | null) => void
  skillDefs?: SkillDef[]
}) {
  const selectedSport = useFrontierStore((s) => s.selectedSport)
  const getSkillsForSport = useFrontierStore((s) => s.getSkillsForSport)
  const skillById = useFrontierStore((s) => s.skillById)
  const mastered = useFrontierStore((s) => s.mastered)
  const readinessScore = useFrontierStore((s) => s.readinessScore)

  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set())
  const rfRef = useRef<{ fitView: (opts?: { padding?: number; duration?: number }) => void } | null>(null)

  const defs = useMemo(
    () => skillDefs ?? getSkillsForSport(selectedSport),
    [skillDefs, getSkillsForSport, selectedSport],
  )

  const allLevels = useMemo(
    () => [...new Set(defs.map((s) => s.level))].sort((a, b) => a - b),
    [defs],
  )

  const toggleLevel = useCallback((level: number) => {
    setExpandedLevels((prev) => {
      const next = new Set(prev)
      if (next.has(level)) next.delete(level)
      else next.add(level)
      return next
    })
  }, [])

  const allExpanded = allLevels.length > 0 && allLevels.every((l) => expandedLevels.has(l))

  const toggleAll = useCallback(() => {
    setExpandedLevels(allExpanded ? new Set() : new Set(allLevels))
  }, [allExpanded, allLevels])

  useEffect(() => {
    if (!selectedId) return
    const skill = defs.find((s) => s.id === selectedId)
    if (skill && !expandedLevels.has(skill.level)) {
      onSelectNode(null)
    }
  }, [expandedLevels, selectedId, defs, onSelectNode])

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => layoutSkillTree(defs, expandedLevels),
    [defs, expandedLevels],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges)

  useEffect(() => {
    const layout = layoutSkillTree(defs, expandedLevels)
    setNodes(layout.nodes)
    setEdges(
      layout.edges.map((e) => {
        if (e.target.startsWith('level-group-')) {
          return { ...e, animated: false, style: { stroke: '#334155', strokeWidth: 1.5 } }
        }
        const { stroke, width, animated } = edgeStrokeForTarget(e.target, mastered, readinessScore, skillById)
        return { ...e, animated, style: { stroke, strokeWidth: width } }
      }),
    )
  }, [defs, expandedLevels, mastered, readinessScore, setNodes, setEdges, skillById])

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === selectedId,
      })),
    )
  }, [selectedId, setNodes])

  useEffect(() => {
    if (rfRef.current) {
      requestAnimationFrame(() => rfRef.current?.fitView({ padding: 0.15, duration: 280 }))
    }
  }, [expandedLevels])

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === 'levelGroup') {
        toggleLevel((node.data as Record<string, unknown>).level as number)
        return
      }
      onSelectNode(node.id)
    },
    [onSelectNode, toggleLevel],
  )

  const onPaneClick = useCallback(() => {
    onSelectNode(null)
  }, [onSelectNode])

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleAll}
          className="border border-[#2e3348] bg-[#111218] px-2.5 py-1 text-[11px] font-semibold text-slate-400 shadow-lg transition hover:bg-[#1e2030] hover:text-white"
        >
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
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
    </div>
  )
}
