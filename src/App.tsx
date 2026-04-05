import { lazy, Suspense } from 'react'
import { AutoregulationPanel } from './components/AutoregulationPanel'

const GraphCanvas = lazy(async () => {
  const m = await import('./components/GraphScene')
  return { default: m.GraphCanvas }
})

function GraphFallback() {
  return (
    <div className="flex h-[min(72vh,560px)] min-h-[320px] w-full items-center justify-center rounded-xl bg-[#07080d] md:h-[min(78vh,640px)]">
      <p className="text-sm text-slate-500">Loading visualization…</p>
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-svh bg-[#0a0b10] text-slate-100">
      <header className="border-b border-slate-800/80 px-4 py-6 text-center md:px-8 md:py-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/90">
          Helm Labs · Frontier OS
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50 md:text-3xl">
          Basketball development constellation
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
          A 3D dependency graph of athletic, nutritional, and technical skills.
          Drag nodes to explore the layout. Tap a glowing frontier node (no
          drag) to mark it mastered—watch the pulse unlock downstream skills.
        </p>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 pb-12 pt-6 md:gap-8 md:px-8 md:pb-16 md:pt-8">
        <AutoregulationPanel />

        <div className="w-full overflow-hidden rounded-xl border border-slate-800/80 bg-[#07080d] shadow-2xl">
          <Suspense fallback={<GraphFallback />}>
            <GraphCanvas />
          </Suspense>
        </div>

        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
          <li>
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-slate-600 opacity-40" />
            Locked
          </li>
          <li>
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            Frontier (tap to master)
          </li>
          <li>
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Mastered
          </li>
          <li>
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-orange-500 opacity-80" />
            High risk (fatigue lock)
          </li>
        </ul>
      </main>
    </div>
  )
}
