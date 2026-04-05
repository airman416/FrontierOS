import { bannerForReadiness } from '../data/graph'
import { useFrontierStore } from '../store/useFrontierStore'

export function AutoregulationPanel() {
  const readinessScore = useFrontierStore((s) => s.readinessScore)
  const setReadinessScore = useFrontierStore((s) => s.setReadinessScore)
  const resetDemo = useFrontierStore((s) => s.resetDemo)

  return (
    <div className="w-full max-w-3xl rounded-xl border border-slate-700/80 bg-slate-900/90 px-4 py-4 text-slate-100 shadow-lg backdrop-blur-md md:px-6">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label
          htmlFor="readiness"
          className="text-sm font-medium tracking-tight text-slate-200"
        >
          Daily Readiness Score
        </label>
        <span className="font-mono text-lg tabular-nums text-cyan-300">
          {readinessScore}
        </span>
      </div>
      <input
        id="readiness"
        type="range"
        min={0}
        max={100}
        value={readinessScore}
        onChange={(e) => setReadinessScore(Number(e.target.value))}
        className="accent-cyan-400 h-3 w-full cursor-pointer touch-pan-y"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={readinessScore}
      />
      <p className="mt-3 text-left text-sm leading-relaxed text-slate-400">
        {bannerForReadiness(readinessScore)}
      </p>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={resetDemo}
          className="rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-sm text-slate-200 transition hover:border-cyan-700 hover:bg-slate-800"
        >
          Reset demo
        </button>
      </div>
    </div>
  )
}
