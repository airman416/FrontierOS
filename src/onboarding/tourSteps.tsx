import type { StepType } from '@reactour/tour'
import type { PositionProps } from '@reactour/popover'
import type { RectResult } from '@reactour/utils'

/** Stable selectors for tour orchestration (e.g. advance after switching to athlete role). */
export const ROLE_TOGGLE_TOUR_SELECTOR = '[data-tour="role-toggle"]'
export const ATHLETE_HOME_PREVIEW_SELECTOR = '[data-tour="athlete-home-daily"]'
export const ATHLETE_TOUR_WRAP_UP_SELECTOR = '[data-tour="athlete-tour-wrap-up"]'

/** Avoid Reactour falling back to `center` (covers the graph) when the map is full-width. */
function skillMapTourPosition(props: PositionProps, _prev: RectResult): 'bottom' | 'left' | 'right' {
  const minSide = 340
  const spaceRight = props.windowWidth - props.right
  const spaceLeft = props.left
  if (spaceRight >= minSide) return 'right'
  if (spaceLeft >= minSide) return 'left'
  return 'bottom'
}

/**
 * Builder header controls sit near the top. If `bottom` does not fit, @reactour/popover runs
 * auto-position and often picks `top`, which uses `targetTop - height` and clips under the
 * viewport. Prefer `bottom` only when there is room; otherwise `center` (never `top`).
 */
function topBarTourPosition(props: PositionProps, _prev: RectResult): 'bottom' | 'center' {
  const popoverPad = 16 // keep in sync with `TourProvider` `padding.popover` in App.tsx
  const spaceBelow = props.windowHeight - props.bottom
  if (spaceBelow > props.height + popoverPad) return 'bottom'
  return 'center'
}

/** Pin the popover just under the highlight; named sides often auto-pick `top` and clip at the viewport edge. */
function popoverBelowHighlightedTarget(
  props: PositionProps,
  _prev: RectResult,
): 'bottom' | [number, number] {
  const gap = 12
  const margin = 12
  if (props.width <= 0 || props.height <= 0) return 'bottom'
  const targetMidX = (props.left + props.right) / 2
  let x = targetMidX - props.width / 2
  x = Math.min(Math.max(margin, x), props.windowWidth - props.width - margin)
  const y = props.bottom + gap
  return [x, y]
}

export function dashboardFirstStep(hasExistingTeamPlan: boolean): StepType {
  if (hasExistingTeamPlan) {
    return {
      selector: '[data-tour="team-plan-cta"]',
      content:
        'Tap Generate Team Plan or Edit Team Plan. The tour picks up again on the next screen.',
      position: 'bottom',
      disableActions: true,
      stepInteraction: true,
    }
  }
  return {
    selector: '[data-tour="start-here-banner"]',
    content:
      'Tap the big Generate Team Plan button. The tour keeps going on the next screen after you tap.',
    position: 'bottom',
    disableActions: true,
    stepInteraction: true,
  }
}

/** Team plan builder: form stage (one spotlight so the mask does not cover Generate). */
export const builderFormTourSteps: StepType[] = [
  {
    selector: '[data-tour="builder-form-card"]',
    content:
      'Say how you coach your team. This creates a baseline blueprint: every athlete will get their own copy of this exact plan to start. You can write a little or a lot. When you are ready, tap Generate Team Plan and wait.',
    position: 'right',
    disableActions: true,
    stepInteraction: true,
  },
]

/** Map first, then optional chat so skipping edits is obvious (use the tour forward arrow). */
const graphPreviewStep: StepType = {
  selector: '[data-tour="builder-graph-preview"]',
  content:
    "This map is your team's baseline blueprint. Every athlete gets this exact skill tree as their starting point.\n\nEach box is a skill. Lines show how easier skills connect to harder ones.\n\nTap a box to read about it. Drag to move the map.\n\nWant the next tip? Tap the forward arrow below.",
  position: skillMapTourPosition,
  /** Reset Reactour’s global `disabledActions` after a step that used `disableActions: true`. */
  disableActions: false,
}

const chatPanelStep: StepType = {
  selector: '[data-tour="builder-chat-panel"]',
  content:
    'Want to change the map? Type here and send. Each answer updates the picture. Happy with it? Tap the forward arrow on this tour to skip this step.',
  position: 'right',
  disableActions: false,
}

const proceedOnboardingStep: StepType = {
  selector: '[data-tour="builder-proceed-onboarding"]',
  content:
    'When you are ready for athletes to take the short check-in quiz, tap Proceed to onboarding. You go back to your roster.',
  position: popoverBelowHighlightedTarget,
  disableActions: true,
  stepInteraction: true,
}

/** Post–check-in summary modal; before `studentDetailTourSteps` when the welcome tour continues there. */
export const diagnosticSummaryTrainingMenuStep: StepType = {
  selector: '[data-tour="diagnostic-summary-training-menu"]',
  content:
    "Tap the button with their name: View …'s Training Menu. That opens their drills and map for the next part of this walkthrough.",
  position: popoverBelowHighlightedTarget,
  disableActions: true,
  stepInteraction: true,
}

const dashboardBackStep: StepType = {
  selector: '[data-tour="builder-dashboard-back"]',
  content:
    'Tap Dashboard when you want to leave. From the roster you can open each player for drills or the check-in quiz.',
  position: topBarTourPosition,
  disableActions: false,
}

/** Chat phase: map, optional chat, then proceed or Dashboard. */
export function builderChatTourSteps(includeProceedOnboarding: boolean): StepType[] {
  const tail = includeProceedOnboarding ? proceedOnboardingStep : dashboardBackStep
  return [graphPreviewStep, chatPanelStep, tail]
}

/** After one diagnostic, on the student detail screen (welcome “full” tour only). */
export const studentDetailTourSteps: StepType[] = [
  {
    selector: '[data-tour="student-onboarding-stats"]',
    content:
      'The check-in you just finished sorted skills into mastered, conditional, and still to learn. Those counts drive what shows up on the map and in the training menu.',
    position: 'bottom',
    disableActions: false,
  },
  {
    selector: '[data-tour="student-training-menu"]',
    content:
      'This is their training menu preview: tasks and drills picked from the team plan and where this athlete sits on the graph.',
    position: 'left',
    disableActions: false,
  },
  {
    selector: '[data-tour="student-skill-graph"]',
    content:
      'This map starts as an exact copy of your team plan: easier skills settle under tougher ones like rungs on a ladder. Tap any skill to inspect it.',
    position: 'right',
    disableActions: false,
  },
  {
    selector: '[data-tour="student-finetune-hint"]',
    content:
      'Later you can fine-tune only this athlete’s map without affecting anyone else. It stays here whenever you come back.',
    position: 'left',
    disableActions: false,
  },
  {
    selector: '[data-tour="student-task-list"]',
    content:
      'Tasks on the right line up with skills that need work. Athletes check these off as they train.',
    position: 'left',
    disableActions: false,
  },
  {
    selector: ROLE_TOGGLE_TOUR_SELECTOR,
    content:
      'Tap Athlete on this switch to see what players see on their own screen. The next tip opens right after you switch.',
    position: popoverBelowHighlightedTarget,
    disableActions: true,
    stepInteraction: true,
  },
  {
    selector: ATHLETE_HOME_PREVIEW_SELECTOR,
    content:
      'What players see here:\n• Check off today\'s work and see whether they\'re on track.\n• Dip in between classes and practice: short visits, not a long homework portal.\n\nOn our roadmap:\n• Short video cues from coaches.\n• Wearable signals so effort is tracked fairly.\n• Small teammate groups so people hold each other accountable: tasks get marked honestly, not half-checked just to clear the list.',
    /** Large highlight; center keeps the card readable on small screens. */
    position: 'center',
    disableActions: false,
  },
  {
    selector: ATHLETE_TOUR_WRAP_UP_SELECTOR,
    content:
      "You're at the end of this walkthrough.\n\nTake your time exploring: use the training menu, switch roles with Coach / Athlete when you want, or tap X to close the tour and browse on your own.",
    position: 'center',
    disableActions: false,
  },
]
