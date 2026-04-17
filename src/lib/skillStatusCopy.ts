import type { VisualRole } from '../store/useFrontierStore'

export function statusHeadline(role: VisualRole): string {
  switch (role) {
    case 'mastered':
      return 'Mastered'
    case 'frontier':
      return 'Ready to train'
    case 'highRisk':
      return 'Paused'
    case 'conditional':
      return 'Conditionally mastered'
    case 'dueReview':
      return 'Due for review'
    default:
      return 'Locked'
  }
}

export function statusBlurb(role: VisualRole): string {
  switch (role) {
    case 'mastered':
      return 'Benchmark cleared. Reinforce with game reps.'
    case 'frontier':
      return 'Prereqs complete. Train with your coach, then mark done.'
    case 'highRisk':
      return 'Waiting for readiness to improve.'
    case 'conditional':
      return 'Shaky mastery — boost confidence with downstream reps.'
    case 'dueReview':
      return 'Review spacing lapsed — revisit to keep retention.'
    default:
      return 'Complete prerequisites first.'
  }
}
