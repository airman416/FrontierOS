import type { Step } from 'react-joyride'

function TechniqueContent({
  color,
  technique,
  description,
  example,
}: {
  color: string
  technique: string
  description: string
  example: string
}) {
  return (
    <div className="space-y-2 text-left">
      <span
        className="inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
        style={{ backgroundColor: color }}
      >
        {technique}
      </span>
      <p className="text-[13px] leading-relaxed text-slate-300">
        {description}
      </p>
      <p className="text-[11px] leading-snug text-slate-500">
        <span className="font-semibold text-slate-400">In practice:</span>{' '}
        {example}
      </p>
    </div>
  )
}

/* ── Phase 1: Dashboard ── */

export function getDashboardTourSteps(): Step[] {
  return [
    {
      target: '[data-tour="dashboard-header"]',
      title: 'Welcome to Frontier OS',
      content:
        'The coaching dashboard for Texas Sports Academy. This tour covers the roster, team heatmap, and walks through every learning-science technique powering athlete development.',
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="roster-tour-anchor"]',
      spotlightTarget: '[data-tour="roster-grid"]',
      title: 'Athlete roster',
      content:
        'Every athlete at a glance \u2014 mastery progress and readiness score. Green bars show how far through the skill tree each player has progressed.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="heatmap-tab"]',
      title: 'Team Heatmap',
      content:
        'Switch tabs to see all athletes \u00d7 all skills in one grid. Instantly spot team-wide gaps and identify who needs focused coaching.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="roster-card-first"]',
      title: 'Skill map',
      content:
        'Each athlete has an interactive skill map \u2014 a prerequisite graph of athletic, nutritional, and technical skills. Let\u2019s open one and walk through the science.',
      placement: 'right',
    },
  ]
}

/* ── Phase 2: Skill map ── */

export function getTreeTourSteps(): Step[] {
  return [
    /* ── Navigation ── */
    {
      target: '[data-tour="tree-header"]',
      title: 'Navigation',
      content:
        'Back returns to the roster. Reset clears mastery to the starting state.',
      placement: 'bottom',
      skipBeacon: true,
    },

    /* ── Technique 1: Knowledge graph ── */
    {
      target: '[data-tour="skill-canvas"]',
      title: '\u2460 Knowledge Graph',
      content: (
        <TechniqueContent
          color="#2563eb"
          technique="Knowledge graph"
          description={
            'Each node is a skill, and arrows are prerequisites. A skill only unlocks once every prerequisite is mastered \u2014 building on verified foundations prevents gaps that compound later.'
          }
          example={
            '\u201cMobility + core\u201d \u2014 Jordan hits ankle dorsiflexion and core anti-rotation before heavy squats, because the graph won\u2019t let him skip them.'
          }
        />
      ),
      placement: 'center',
    },

    /* ── Technique 2: Physical frontier ── */
    {
      target: '[data-tour="skill-canvas"]',
      title: '\u2461 Physical Frontier',
      content: (
        <TechniqueContent
          color="#7c3aed"
          technique="Physical frontier"
          description={
            'Blue nodes are the frontier \u2014 the exact skills this athlete is ready to learn right now. Training targets actual weak points instead of running a generic program.'
          }
          example={
            '\u201cRepeat sprints\u201d \u2014 this athlete\u2019s limiter is late-inning repeat effort, so the system puts it on the frontier.'
          }
        />
      ),
      placement: 'center',
    },

    /* ── Technique 3: Autoregulation ── */
    {
      target: '[data-tour="readiness-strip"]',
      title: '\u2462 Autoregulation',
      content: (
        <TechniqueContent
          color="#db2777"
          technique="Autoregulation"
          description={
            'Drag the slider to simulate fatigue. The graph reacts \u2014 high-impact skills lock when readiness drops. Volume and intensity adjust automatically based on the athlete\u2019s current state.'
          }
          example={
            '\u201cAuto-adjust\u201d \u2014 if CNS is fatigued, bar speed targets drop and recovery fueling bumps up.'
          }
        />
      ),
      placement: 'left',
    },

    /* ── Technique 4: Objective readiness ── */
    {
      target: '[data-tour="node-inspector"]',
      title: '\u2463 Objective Readiness',
      content: (
        <TechniqueContent
          color="#ca8a04"
          technique="Objective readiness"
          description={
            'Tap any node to inspect it. Athletes advance by demonstrating mastery on benchmarks \u2014 not by age or time served. No social promotion.'
          }
          example={
            '\u201cClearance check\u201d \u2014 benchmarks gate advancement. An athlete stays at a level until the numbers say they\u2019re ready.'
          }
        />
      ),
      placement: 'left',
    },

    /* ── Technique 5: Spaced repetition ── */
    {
      target: '[data-tour="task-batting-practice"]',
      title: '\u2464 Spaced Repetition',
      content: (
        <TechniqueContent
          color="#059669"
          technique="Spaced repetition"
          description={
            'Spreading practice across sessions produces stronger, longer-lasting motor memory than marathon blocks. Small daily doses beat cram sessions.'
          }
          example={
            '\u201cBP reps\u201d \u2014 short batting practice sets every day, not one exhausting block per week.'
          }
        />
      ),
      placement: 'left',
    },

    /* ── Technique 6: Interleaving ── */
    {
      target: '[data-tour="task-live-at-bats"]',
      title: '\u2465 Interleaving',
      content: (
        <TechniqueContent
          color="#3b82f6"
          technique="Interleaving"
          description={
            'Mixing different skill types in a single session transfers to real game situations better than blocked repetition of one drill.'
          }
          example={
            '\u201cLive ABs\u201d \u2014 live at-bats against random pitch sequences force read-and-react decisions, not rehearsed timing.'
          }
        />
      ),
      placement: 'left',
    },

    /* ── Technique 7: Testing effect ── */
    {
      target: '[data-tour="task-pressure-abs"]',
      title: '\u2466 Testing Effect',
      content: (
        <TechniqueContent
          color="#ea580c"
          technique="Testing effect"
          description={
            'Retrieval under pressure reveals what truly stuck and actively strengthens retention. Uncontested reps mask gaps.'
          }
          example={
            '\u201cClutch ABs\u201d \u2014 hit against live arms in high-leverage counts. If it only works off a tee, it hasn\u2019t stuck.'
          }
        />
      ),
      placement: 'left',
    },

    /* ── Technique 8: Non-interference ── */
    {
      target: '[data-tour="task-non-interference"]',
      title: '\u2467 Non-interference',
      content: (
        <TechniqueContent
          color="#64748b"
          technique="Non-interference"
          description={
            'One primary motor pattern per training window. Stacking competing movement patterns in the same session interferes with memory consolidation for both.'
          }
          example={
            '\u201cSingle focus\u201d \u2014 isolate one motor habit per micro-cycle so it consolidates overnight without competition.'
          }
        />
      ),
      placement: 'left',
    },

    /* ── Technique 9: Automaticity ── */
    {
      target: '[data-tour="task-automaticity"]',
      title: '\u2468 Automaticity',
      content: (
        <TechniqueContent
          color="#6366f1"
          technique="Automaticity"
          description={
            'Practicing basics until they are fully automatic frees the athlete\u2019s conscious attention for game reads and decision-making.'
          }
          example={
            '\u201cGlove work\u201d \u2014 low-load fielding drills until the glove works on its own, so eyes stay up and read the play.'
          }
        />
      ),
      placement: 'left',
    },

    /* ── Technique 10: Encompassings ── */
    {
      target: '[data-tour="task-encompassings"]',
      title: '\u2469 Encompassings',
      content: (
        <TechniqueContent
          color="#0f766e"
          technique="Encompassings"
          description={
            'Advanced activities naturally reinforce many foundation skills at once. Complex game scenarios rehearse sprint, jump, and spatial awareness simultaneously.'
          }
          example={
            '\u201cIntrasquad\u201d \u2014 intrasquad scrimmages combine baserunning, fielding, situational play, and conditioning in a single rep.'
          }
        />
      ),
      placement: 'left',
    },

    /* ── Legend ── */
    {
      target: '[data-tour="map-key"]',
      title: 'Legend',
      content: 'Decode node colors at a glance.',
      placement: 'left',
    },

    /* ── Roadmap ── */
    {
      target: '[data-tour="roadmap"]',
      title: 'Roadmap',
      content: 'Planned features \u2014 not in the build yet.',
      placement: 'left',
    },
  ]
}
