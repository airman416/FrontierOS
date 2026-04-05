import { create } from 'zustand'
import {
  readinessBand,
  SKILL_DEFS,
  SKILL_BY_ID,
  type ReadinessBand,
  type SkillDef,
} from '../data/graph'

export type VisualRole = 'locked' | 'frontier' | 'mastered' | 'highRisk'

export interface SimNode extends SkillDef {
  x: number
  y: number
  z: number
  vx?: number
  vy?: number
  vz?: number
  fx?: number | null
  fy?: number | null
  fz?: number | null
}

export interface PulseEdge {
  id: string
  fromId: string
  toId: string
  startedAt: number
}

function basePrereqsMet(id: string, mastered: Set<string>): boolean {
  const s = SKILL_BY_ID[id]
  return s.prereqs.every((p) => mastered.has(p))
}

function computeBaseLocked(id: string, mastered: Set<string>): boolean {
  const s = SKILL_BY_ID[id]
  return s.prereqs.some((p) => !mastered.has(p))
}

function maxFrontierLevel(band: ReadinessBand): number {
  if (band === 'full') return 6
  if (band === 'moderate') return 3
  return 1
}

export function computeVisualRole(
  id: string,
  mastered: Set<string>,
  readinessScore: number,
): VisualRole {
  const s = SKILL_BY_ID[id]
  const band = readinessBand(readinessScore)
  const baseLocked = computeBaseLocked(id, mastered)
  const isMastered = mastered.has(id)
  const prereqsMet = basePrereqsMet(id, mastered)
  const maxLv = maxFrontierLevel(band)

  if (band === 'moderate' && s.level >= 4) {
    if (isMastered || (!baseLocked && !isMastered)) {
      return 'highRisk'
    }
    return 'locked'
  }

  if (band === 'severe' && s.level >= 2) {
    return 'locked'
  }

  if (baseLocked) return 'locked'
  if (isMastered) return 'mastered'

  if (s.level <= maxLv && prereqsMet) return 'frontier'
  return 'locked'
}

export function isClickableFrontier(
  id: string,
  mastered: Set<string>,
  readinessScore: number,
): boolean {
  return computeVisualRole(id, mastered, readinessScore) === 'frontier'
}

interface FrontierState {
  mastered: Set<string>
  readinessScore: number
  pulses: PulseEdge[]

  setReadinessScore: (n: number) => void
  toggleMaster: (id: string) => void
  prunePulses: (now: number) => void
  resetDemo: () => void

  getVisualRole: (id: string) => VisualRole
}

const INITIAL_MASTERED = new Set<string>([
  'sleep-hygiene',
  'joint-mobility',
  'aerobic-base',
])

export const useFrontierStore = create<FrontierState>((set, get) => ({
  mastered: new Set(INITIAL_MASTERED),
  readinessScore: 100,
  pulses: [],

  setReadinessScore: (n) =>
    set({ readinessScore: Math.max(0, Math.min(100, Math.round(n))) }),

  toggleMaster: (id) => {
    const { mastered, readinessScore } = get()
    if (!isClickableFrontier(id, mastered, readinessScore)) return

    const next = new Set(mastered)
    next.add(id)

    const newlyUnlocked: string[] = []
    for (const s of SKILL_DEFS) {
      if (next.has(s.id)) continue
      if (!s.prereqs.includes(id)) continue
      const wasLocked = !basePrereqsMet(s.id, mastered)
      const nowUnlocked = basePrereqsMet(s.id, next)
      if (wasLocked && nowUnlocked) newlyUnlocked.push(s.id)
    }

    const now = performance.now()
    const newPulses: PulseEdge[] = newlyUnlocked.map((toId) => ({
      id: `${id}->${toId}-${now}`,
      fromId: id,
      toId,
      startedAt: now,
    }))

    set({
      mastered: next,
      pulses: [...get().pulses, ...newPulses].slice(-24),
    })
  },

  prunePulses: (now) => {
    const keep = get().pulses.filter((p) => now - p.startedAt < 1600)
    if (keep.length !== get().pulses.length) set({ pulses: keep })
  },

  resetDemo: () =>
    set({
      mastered: new Set(INITIAL_MASTERED),
      readinessScore: 100,
      pulses: [],
    }),

  getVisualRole: (id) =>
    computeVisualRole(id, get().mastered, get().readinessScore),
}))
