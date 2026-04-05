import { forceCenter, forceLink, forceManyBody, forceSimulation } from 'd3-force-3d'
import { buildLinks, SKILL_DEFS } from '../data/graph'
import type { SimNode } from '../store/useFrontierStore'

const links = buildLinks()

let simNodes: SimNode[] | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let simulation: any = null

function seedPositions(): SimNode[] {
  return SKILL_DEFS.map((def, i) => {
    const t = (i / SKILL_DEFS.length) * Math.PI * 2
    const r = 2.4 + (def.level / 6) * 2.2
    return {
      ...def,
      x: Math.cos(t) * r + (Math.random() - 0.5) * 0.4,
      y: (def.level - 3.5) * 0.5 + (Math.random() - 0.5) * 0.3,
      z: Math.sin(t) * r + (Math.random() - 0.5) * 0.4,
    }
  })
}

export function getSimulation(): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  simulation: any
  nodes: SimNode[]
} {
  if (!simNodes) {
    simNodes = seedPositions()
  }
  if (!simulation) {
    const linkForce = forceLink(links)
      .id((d: SimNode) => d.id)
      .distance((l: { source: SimNode; target: SimNode }) => {
        const la = l.source?.level ?? 3
        const lb = l.target?.level ?? 3
        return 1.8 + (la + lb) * 0.35
      })
      .strength(0.65)

    simulation = forceSimulation(simNodes as SimNode[])
      .force('link', linkForce)
      .force('charge', forceManyBody().strength(-140))
      .force('center', forceCenter(0, 0, 0))
      .velocityDecay(0.35)
      .alpha(0.9)
      .alphaDecay(0.02)
  }
  return { simulation, nodes: simNodes }
}
