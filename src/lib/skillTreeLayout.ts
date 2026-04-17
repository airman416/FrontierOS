import dagre from 'dagre'
import type { Edge, Node } from '@xyflow/react'
import type { SkillDef } from '../data/graph'

export const SKILL_NODE_W = 178
export const SKILL_NODE_H = 58
export const LEVEL_GROUP_W = 220
export const LEVEL_GROUP_H = 72

export const LEVEL_LABELS: Record<number, string> = {
  1: 'Foundations',
  2: 'Base Training',
  3: 'Development',
  4: 'Advanced',
  5: 'Integration',
  6: 'Peak',
}

function groupNodeId(level: number): string {
  return `level-group-${level}`
}

function buildLinksFromDefs(defs: SkillDef[]): { source: string; target: string }[] {
  const idSet = new Set(defs.map((s) => s.id))
  const links: { source: string; target: string }[] = []
  for (const s of defs) {
    for (const p of s.prereqs) {
      if (idSet.has(p)) links.push({ source: p, target: s.id })
    }
  }
  return links
}

export interface LayoutSkillTreeOptions {
  /** If set, every skill node gets `data.athleteId` so scoped visuals render. */
  athleteId?: string
}

export function layoutSkillTree(
  defs: SkillDef[],
  expandedLevels?: Set<number>,
  options: LayoutSkillTreeOptions = {},
): { nodes: Node[]; edges: Edge[] } {
  const allLevels = new Set(defs.map((s) => s.level))
  const expanded = expandedLevels ?? allLevels

  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: 'LR',
    ranksep: 120,
    nodesep: 40,
    marginx: 32,
    marginy: 32,
    edgesep: 16,
  })

  const byLevel = new Map<number, SkillDef[]>()
  for (const s of defs) {
    const group = byLevel.get(s.level) ?? []
    group.push(s)
    byLevel.set(s.level, group)
  }

  for (const [level, skills] of byLevel) {
    if (expanded.has(level)) {
      for (const s of skills) {
        g.setNode(s.id, { width: SKILL_NODE_W, height: SKILL_NODE_H })
      }
    } else {
      g.setNode(groupNodeId(level), { width: LEVEL_GROUP_W, height: LEVEL_GROUP_H })
    }
  }

  const skillLevel = new Map(defs.map((s) => [s.id, s.level]))
  const rawLinks = buildLinksFromDefs(defs)
  const edgeDedup = new Set<string>()
  const edgeCounts = new Map<string, number>()
  const remappedLinks: { source: string; target: string }[] = []

  for (const l of rawLinks) {
    const srcLevel = skillLevel.get(l.source)!
    const tgtLevel = skillLevel.get(l.target)!
    const src = expanded.has(srcLevel) ? l.source : groupNodeId(srcLevel)
    const tgt = expanded.has(tgtLevel) ? l.target : groupNodeId(tgtLevel)
    if (src === tgt) continue
    const key = `${src}\u2192${tgt}`
    edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1)
    if (edgeDedup.has(key)) continue
    edgeDedup.add(key)
    remappedLinks.push({ source: src, target: tgt })
  }

  for (const l of remappedLinks) {
    g.setEdge(l.source, l.target)
  }
  dagre.layout(g)

  const nodes: Node[] = []
  for (const [level, skills] of byLevel) {
    if (expanded.has(level)) {
      for (const s of skills) {
        const pos = g.node(s.id) ?? { x: 0, y: 0 }
        nodes.push({
          id: s.id,
          type: 'skill',
          position: { x: pos.x - SKILL_NODE_W / 2, y: pos.y - SKILL_NODE_H / 2 },
          data: options.athleteId ? { athleteId: options.athleteId } : {},
        })
      }
    } else {
      const gid = groupNodeId(level)
      const pos = g.node(gid) ?? { x: 0, y: 0 }
      nodes.push({
        id: gid,
        type: 'levelGroup',
        position: { x: pos.x - LEVEL_GROUP_W / 2, y: pos.y - LEVEL_GROUP_H / 2 },
        data: {
          level,
          count: skills.length,
          label: LEVEL_LABELS[level] ?? `Level ${level}`,
          skillLabels: skills.map((s) => s.label),
        },
      })
    }
  }

  const edges: Edge[] = remappedLinks.map((l, i) => {
    const key = `${l.source}\u2192${l.target}`
    const count = edgeCounts.get(key) ?? 1
    const isGroupEdge =
      l.source.startsWith('level-group-') || l.target.startsWith('level-group-')

    return {
      id: `e-${l.source}-${l.target}-${i}`,
      source: l.source,
      target: l.target,
      type: 'default',
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      ...(isGroupEdge && count > 1
        ? {
            label: `\u00d7${count}`,
            labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 600 },
            labelBgStyle: { fill: '#111218', stroke: '#2e3348', strokeWidth: 1 },
            labelBgPadding: [4, 6] as [number, number],
            labelBgBorderRadius: 4,
          }
        : {}),
    }
  })

  // Lane background nodes (positioned behind skill nodes)
  const LANE_PAD = 20
  if (nodes.length > 0) {
    const allMinY = Math.min(...nodes.map((n) => n.position.y))
    const allMaxY = Math.max(
      ...nodes.map((n) => {
        const h = n.type === 'levelGroup' ? LEVEL_GROUP_H : SKILL_NODE_H
        return n.position.y + h
      }),
    )
    const laneHeight = allMaxY - allMinY + LANE_PAD * 2

    for (const [level] of byLevel) {
      const levelNodes = nodes.filter((n) => {
        if (n.type === 'levelGroup')
          return (n.data as Record<string, unknown>).level === level
        return skillLevel.get(n.id) === level
      })
      if (levelNodes.length === 0) continue

      const minX = Math.min(...levelNodes.map((n) => n.position.x))
      const maxX = Math.max(
        ...levelNodes.map((n) => {
          const w = n.type === 'levelGroup' ? LEVEL_GROUP_W : SKILL_NODE_W
          return n.position.x + w
        }),
      )

      nodes.push({
        id: `lane-${level}`,
        type: 'lane',
        position: { x: minX - LANE_PAD, y: allMinY - LANE_PAD },
        data: { level, width: maxX - minX + LANE_PAD * 2, height: laneHeight },
        zIndex: -1,
        selectable: false,
        draggable: false,
        style: { pointerEvents: 'none' },
      })
    }
  }

  return { nodes, edges }
}
