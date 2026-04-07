import dagre from 'dagre'
import type { Edge, Node } from '@xyflow/react'
import { buildLinks, SKILL_DEFS } from '../data/graph'

export const SKILL_NODE_W = 178
export const SKILL_NODE_H = 58

export function layoutSkillTree(): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: 'LR',
    ranksep: 64,
    nodesep: 26,
    marginx: 32,
    marginy: 32,
    edgesep: 12,
  })

  for (const s of SKILL_DEFS) {
    g.setNode(s.id, { width: SKILL_NODE_W, height: SKILL_NODE_H })
  }
  for (const l of buildLinks()) {
    g.setEdge(l.source, l.target)
  }
  dagre.layout(g)

  const nodes: Node[] = SKILL_DEFS.map((s) => {
    const pos = g.node(s.id) ?? { x: SKILL_NODE_W, y: SKILL_NODE_H }
    return {
      id: s.id,
      type: 'skill',
      position: { x: pos.x - SKILL_NODE_W / 2, y: pos.y - SKILL_NODE_H / 2 },
      data: {},
    }
  })

  const edges: Edge[] = buildLinks().map((l, i) => ({
    id: `e-${l.source}-${l.target}-${i}`,
    source: l.source,
    target: l.target,
    type: 'smoothstep',
    style: { stroke: '#94a3b8', strokeWidth: 2 },
  }))

  return { nodes, edges }
}
