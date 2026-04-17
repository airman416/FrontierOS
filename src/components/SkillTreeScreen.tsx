import { useCallback, useState } from 'react'
import { getInitials } from '../data/athletes'
import { readinessBand } from '../data/graph'
import { FUTURE_ROADMAP_ITEMS, TECHNIQUE_SWATCH } from '../data/student'
import { statusBlurb, statusHeadline } from '../lib/skillStatusCopy'
import {
  computeVisualRole,
  isClickableFrontier,
  useFrontierStore,
} from '../store/useFrontierStore'
import { RoleToggle } from './RoleToggle'
import { SkillTreeView } from './skill-tree/SkillTreeView'

const ROLE_COLOR: Record<string, string> = {
  mastered: '#10b981',
  frontier: '#3b82f6',
  highRisk: '#f59e0b',
  locked: '#475569',
}

function readinessDotColor(score: number): string {
  const band = readinessBand(score)
  if (band === 'full') return 'bg-emerald-500'
  if (band === 'moderate') return 'bg-amber-500'
  return 'bg-rose-500'
}

export function SkillTreeScreen({
  onBack,
  onReplayTour,
}: {
  onBack: () => void
  onReplayTour: () => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedAthleteId = useFrontierStore((s) => s.selectedAthleteId)
  const resetDemo = useFrontierStore((s) => s.resetDemo)
  const readinessScore = useFrontierStore((s) => s.readinessScore)
  const mastered = useFrontierStore((s) => s.mastered)
  const toggleMaster = useFrontierStore((s) => s.toggleMaster)
  const skillById = useFrontierStore((s) => s.skillById)
  const sportData = useFrontierStore((s) => s.sportData)
  const selectedSport = useFrontierStore((s) => s.selectedSport)
  const getTasksForSport = useFrontierStore((s) => s.getTasksForSport)

  const athlete = sportData.athletes.find((a) => a.id === selectedAthleteId)
  const tasks = getTasksForSport(selectedSport)

  const onMarkDone = useCallback(() => {
    if (selectedId) toggleMaster(selectedId)
  }, [selectedId, toggleMaster])

  const selectedDef = selectedId ? skillById[selectedId] : null
  const selectedRole = selectedId ? computeVisualRole(selectedId, mastered, readinessScore, skillById) : null
  const canMark =
    selectedId && isClickableFrontier(selectedId, mastered, readinessScore, skillById)

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-[#0a0b10]">
      <header
        data-tour="tree-header"
        className="flex shrink-0 items-center gap-3 border-b border-border-subtle bg-surface px-3 py-2.5 md:gap-4 md:px-4"
      >
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 border border-border-subtle bg-surface-raised px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-border-default hover:text-white"
        >
          &larr; Roster
        </button>
        {athlete?.avatarUrl ? (
          <img
            src={athlete.avatarUrl}
            alt=""
            width={36}
            height={36}
            className="hidden h-9 w-9 border border-border-subtle sm:block"
          />
        ) : athlete ? (
          <span
            className="hidden h-9 w-9 shrink-0 items-center justify-center text-sm font-bold text-white sm:flex"
            style={{ backgroundColor: athlete.avatarColor }}
          >
            {getInitials(athlete.displayName)}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{athlete?.displayName}</p>
          <p className="truncate text-[11px] text-slate-500">
            {athlete?.position} &middot; Age {athlete?.age}
          </p>
        </div>

        {/* Read-only readiness badge */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <span className={`h-2 w-2 ${readinessDotColor(readinessScore)}`} />
          <span className="text-[10px] font-bold tabular-nums text-slate-400">
            {readinessScore}%
          </span>
        </div>

        <button
          type="button"
          onClick={resetDemo}
          className="shrink-0 border border-border-subtle bg-surface-raised px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 transition hover:text-white"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onReplayTour}
          className="shrink-0 bg-alpha/15 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-alpha-light transition hover:bg-alpha/25"
        >
          Tour
        </button>
        <RoleToggle />
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div data-tour="skill-canvas" className="relative min-h-[52vh] min-w-0 flex-1 lg:min-h-0">
          <SkillTreeView selectedId={selectedId} onSelectNode={setSelectedId} />
        </div>

        <aside className="flex w-full shrink-0 flex-col border-t border-border-subtle bg-surface lg:w-[280px] lg:border-l lg:border-t-0">
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Node inspector */}
            <div data-tour="node-inspector" className="border-b border-border-subtle p-3">
              {!selectedDef || !selectedRole ? (
                <div className="flex flex-col items-center py-3 text-center">
                  <div className="grid h-10 w-10 grid-cols-2 gap-1">
                    <span className="bg-alpha/20" />
                    <span className="bg-alpha/10" />
                    <span className="bg-alpha/10" />
                    <span className="bg-alpha/20" />
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-400">Tap a node to inspect</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-start gap-2.5">
                    <span
                      className="mt-0.5 h-8 w-1.5 shrink-0"
                      style={{ backgroundColor: ROLE_COLOR[selectedRole] }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lvl {selectedDef.level}</p>
                      <p className="text-sm font-bold leading-tight text-white">{selectedDef.label}</p>
                      <p className="mt-1 text-xs font-semibold" style={{ color: ROLE_COLOR[selectedRole] }}>
                        {statusHeadline(selectedRole)}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{statusBlurb(selectedRole)}</p>
                    </div>
                  </div>

                  {selectedDef.prereqs.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Prerequisites</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedDef.prereqs.map((pid) => (
                          <span
                            key={pid}
                            className="border border-border-subtle bg-surface-elevated px-1.5 py-0.5 text-[10px] font-medium text-slate-400"
                          >
                            {skillById[pid]?.label ?? pid}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {canMark && (
                    <button
                      type="button"
                      onClick={onMarkDone}
                      className="mt-3 w-full bg-emerald-600 py-2 text-xs font-bold text-white transition hover:bg-emerald-500"
                    >
                      Mark mastered
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Tasks + legend + roadmap */}
            <div className="flex flex-1 flex-col overflow-y-auto p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Today</p>
              <ul data-tour="today-tasks" className="mt-2 space-y-1">
                {tasks.map((t) => (
                  <li key={t.id} data-tour={`task-${t.id}`} className="flex gap-2 bg-surface-elevated/60">
                    <span
                      className="w-1 shrink-0 self-stretch"
                      style={{ backgroundColor: TECHNIQUE_SWATCH[t.technique] }}
                      aria-hidden
                    />
                    <span className="py-1.5 pr-2 text-[11px] font-medium leading-tight text-slate-300">
                      {t.shortLabel}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">Legend</p>
              <div data-tour="map-key" className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 bg-slate-500" /> Locked
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 bg-blue-500" /> Ready
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 bg-emerald-500" /> Mastered
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 bg-amber-500" /> Paused
                </span>
              </div>

              <div data-tour="roadmap" className="mt-5 border-t border-border-subtle pt-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Roadmap</p>
                <ul className="mt-2 space-y-1 text-[10px] leading-snug text-slate-500">
                  {FUTURE_ROADMAP_ITEMS.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 h-1 w-1 shrink-0 bg-alpha/40" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
