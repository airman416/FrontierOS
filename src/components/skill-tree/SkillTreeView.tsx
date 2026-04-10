import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type NodeTypes,
} from '@xyflow/react'
import { useCallback, useEffect, useMemo } from 'react'
import { ATHLETE_BY_ID } from '../../data/athletes'
import { buildLinks } from '../../data/graph'
import { layoutSkillTree } from '../../lib/skillTreeLayout'
import { computeVisualRole, useFrontierStore } from '../../store/useFrontierStore'
import { SkillGraphNode } from './SkillGraphNode'

const nodeTypes: NodeTypes = { skill: SkillGraphNode }

function edgeStrokeForTarget(
  targetId: string,
  mastered: Set<string>,
  readiness: number,
): { stroke: string; width: number; animated: boolean } {
  const r = computeVisualRole(targetId, mastered, readiness)
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
}: {
  selectedId: string | null
  onSelectNode: (id: string | null) => void
}) {
  const selectedAthleteId = useFrontierStore((s) => s.selectedAthleteId)
  const athlete = ATHLETE_BY_ID[selectedAthleteId]
  const sport = athlete?.sport ?? 'baseball'

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => layoutSkillTree(sport),
    [sport],
  )
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const mastered = useFrontierStore((s) => s.mastered)
  const readinessScore = useFrontierStore((s) => s.readinessScore)

  useEffect(() => {
    const layout = layoutSkillTree(sport)
    setNodes(layout.nodes.map((n) => ({ ...n, selected: n.id === selectedId })))
    setEdges(layout.edges)
  }, [sport, setNodes, setEdges, selectedId])

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === selectedId,
      })),
    )
  }, [selectedId, setNodes])

  useEffect(() => {
    const links = buildLinks(sport)
    setEdges(
      links.map((l, i) => {
        const { stroke, width, animated } = edgeStrokeForTarget(l.target, mastered, readinessScore)
        return {
          id: `e-${l.source}-${l.target}-${i}`,
          source: l.source,
          target: l.target,
          type: 'smoothstep',
          animated,
          style: { stroke, strokeWidth: width },
        } satisfies Edge
      }),
    )
  }, [mastered, readinessScore, setEdges, sport])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      onSelectNode(node.id)
    },
    [onSelectNode],
  )

  const onPaneClick = useCallback(() => {
    onSelectNode(null)
  }, [onSelectNode])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      onInit={(rf) => {
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
          const r = computeVisualRole(n.id, mastered, readinessScore)
          if (r === 'mastered') return '#10b981'
          if (r === 'frontier') return '#3b82f6'
          if (r === 'highRisk') return '#f59e0b'
          return '#475569'
        }}
        pannable
        zoomable
      />
    </ReactFlow>
  )
}
