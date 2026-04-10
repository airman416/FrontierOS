import type { Sport } from './graph'

export interface Athlete {
  id: string
  displayName: string
  firstName: string
  age: number
  position: string
  schoolYear: string
  sport: Sport
  avatarUrl?: string
  avatarColor: string
  tagline: string
}

export const ATHLETES: Athlete[] = [
  // ── Baseball ──
  {
    id: 'jordan-martinez',
    displayName: 'Jordan Martinez',
    firstName: 'Jordan',
    age: 15,
    position: 'Shortstop',
    schoolYear: 'Sophomore',
    sport: 'baseball',
    avatarUrl: '/avatars/jordan.svg',
    avatarColor: '#2563eb',
    tagline: 'Quick hands, strong arm — building late-game stamina.',
  },
  {
    id: 'aiden-chen',
    displayName: 'Aiden Chen',
    firstName: 'Aiden',
    age: 16,
    position: 'Second Baseman',
    schoolYear: 'Junior',
    sport: 'baseball',
    avatarColor: '#7c3aed',
    tagline: 'Contact hitter refining power at the plate.',
  },
  {
    id: 'marcus-johnson',
    displayName: 'Marcus Johnson',
    firstName: 'Marcus',
    age: 17,
    position: 'Outfielder',
    schoolYear: 'Senior',
    sport: 'baseball',
    avatarColor: '#059669',
    tagline: 'Five-tool outfielder pushing toward peak game performance.',
  },
  {
    id: 'sofia-rodriguez',
    displayName: 'Sofia Rodriguez',
    firstName: 'Sofia',
    age: 14,
    position: 'Shortstop',
    schoolYear: 'Freshman',
    sport: 'baseball',
    avatarColor: '#db2777',
    tagline: 'High baseball IQ, building the athletic foundation to match.',
  },
  {
    id: 'jaylen-williams',
    displayName: 'Jaylen Williams',
    firstName: 'Jaylen',
    age: 16,
    position: 'Catcher',
    schoolYear: 'Junior',
    sport: 'baseball',
    avatarColor: '#ea580c',
    tagline: 'Strong-armed catcher developing pitch framing skills.',
  },
  {
    id: 'emma-davis',
    displayName: 'Emma Davis',
    firstName: 'Emma',
    age: 15,
    position: 'Second Baseman',
    schoolYear: 'Sophomore',
    sport: 'baseball',
    avatarColor: '#0ea5e9',
    tagline: 'Well-rounded infielder with room to grow on both sides of the ball.',
  },
  {
    id: 'tyler-brooks',
    displayName: 'Tyler Brooks',
    firstName: 'Tyler',
    age: 17,
    position: 'First Baseman',
    schoolYear: 'Senior',
    sport: 'baseball',
    avatarColor: '#ca8a04',
    tagline: 'Explosive athlete managing training load for playoffs.',
  },
  {
    id: 'mia-thompson',
    displayName: 'Mia Thompson',
    firstName: 'Mia',
    age: 14,
    position: 'Outfielder',
    schoolYear: 'Freshman',
    sport: 'baseball',
    avatarColor: '#8b5cf6',
    tagline: 'Long, athletic freshman with raw potential.',
  },
  {
    id: 'derek-washington',
    displayName: 'Derek Washington',
    firstName: 'Derek',
    age: 15,
    position: 'Catcher',
    schoolYear: 'Sophomore',
    sport: 'baseball',
    avatarColor: '#64748b',
    tagline: 'Defensive anchor developing offensive versatility.',
  },
  {
    id: 'kayla-foster',
    displayName: 'Kayla Foster',
    firstName: 'Kayla',
    age: 16,
    position: 'First Baseman',
    schoolYear: 'Junior',
    sport: 'baseball',
    avatarColor: '#14b8a6',
    tagline: 'Strong first baseman expanding to opposite-field hitting.',
  },

  // ── Basketball ──
  {
    id: 'malik-rivers',
    displayName: 'Malik Rivers',
    firstName: 'Malik',
    age: 16,
    position: 'Point Guard',
    schoolYear: 'Junior',
    sport: 'basketball',
    avatarColor: '#f97316',
    tagline: 'Floor general with elite handles and growing court vision.',
  },
  {
    id: 'priya-patel',
    displayName: 'Priya Patel',
    firstName: 'Priya',
    age: 15,
    position: 'Shooting Guard',
    schoolYear: 'Sophomore',
    sport: 'basketball',
    avatarColor: '#a855f7',
    tagline: 'Natural shooter building the athletic base to dominate.',
  },
  {
    id: 'dante-collins',
    displayName: 'Dante Collins',
    firstName: 'Dante',
    age: 17,
    position: 'Center',
    schoolYear: 'Senior',
    sport: 'basketball',
    avatarColor: '#22c55e',
    tagline: 'Dominant big man closing in on peak game performance.',
  },
  {
    id: 'ava-kim',
    displayName: 'Ava Kim',
    firstName: 'Ava',
    age: 14,
    position: 'Small Forward',
    schoolYear: 'Freshman',
    sport: 'basketball',
    avatarColor: '#ec4899',
    tagline: 'Versatile wing just starting her development journey.',
  },
  {
    id: 'caleb-monroe',
    displayName: 'Caleb Monroe',
    firstName: 'Caleb',
    age: 16,
    position: 'Power Forward',
    schoolYear: 'Junior',
    sport: 'basketball',
    avatarColor: '#eab308',
    tagline: 'Physical forward developing offensive range.',
  },
]

export const ATHLETE_BY_ID = Object.fromEntries(
  ATHLETES.map((a) => [a.id, a]),
) as Record<string, Athlete>

/** Mastery sets must be prerequisite-consistent with SKILL_DEFS */
export const INITIAL_ATHLETE_MASTERY: Record<string, string[]> = {
  // Baseball
  'jordan-martinez': ['sleep-hygiene', 'joint-mobility', 'aerobic-base'],
  'aiden-chen': [
    'sleep-hygiene', 'joint-mobility', 'aerobic-base',
    'core-stability', 'anaerobic-capacity', 'macro-tracking',
    'batting-tee-work', 'basic-fielding', 'live-pitch-hitting',
  ],
  'marcus-johnson': [
    'sleep-hygiene', 'joint-mobility', 'aerobic-base',
    'core-stability', 'anaerobic-capacity', 'macro-tracking',
    'heavy-resistance', 'batting-tee-work', 'basic-fielding', 'defensive-positioning',
    'plyometrics', 'live-pitch-hitting', 'advanced-fielding',
    'situational-hitting', 'game-day-fueling',
  ],
  'sofia-rodriguez': ['sleep-hygiene'],
  'jaylen-williams': [
    'sleep-hygiene', 'joint-mobility', 'aerobic-base',
    'core-stability', 'anaerobic-capacity',
    'heavy-resistance', 'defensive-positioning',
  ],
  'emma-davis': [
    'sleep-hygiene', 'joint-mobility', 'aerobic-base',
    'core-stability', 'macro-tracking',
    'batting-tee-work', 'basic-fielding',
  ],
  'tyler-brooks': [
    'sleep-hygiene', 'joint-mobility', 'aerobic-base',
    'core-stability', 'anaerobic-capacity', 'macro-tracking',
    'heavy-resistance', 'batting-tee-work', 'defensive-positioning',
    'plyometrics', 'game-day-fueling',
  ],
  'mia-thompson': ['sleep-hygiene', 'joint-mobility'],
  'derek-washington': [
    'sleep-hygiene', 'joint-mobility', 'aerobic-base',
    'core-stability', 'anaerobic-capacity',
    'defensive-positioning',
  ],
  'kayla-foster': [
    'sleep-hygiene', 'joint-mobility', 'aerobic-base',
    'core-stability',
    'heavy-resistance', 'batting-tee-work',
  ],

  // Basketball
  'malik-rivers': [
    'sleep-hygiene', 'joint-mobility', 'aerobic-base',
    'core-stability', 'anaerobic-capacity', 'macro-tracking',
    'ball-handling', 'shooting-form', 'court-vision',
  ],
  'priya-patel': [
    'sleep-hygiene', 'joint-mobility', 'aerobic-base',
    'shooting-form',
  ],
  'dante-collins': [
    'sleep-hygiene', 'joint-mobility', 'aerobic-base',
    'core-stability', 'anaerobic-capacity', 'macro-tracking',
    'heavy-resistance',
    'ball-handling', 'shooting-form', 'defensive-stance',
    'court-vision', 'mid-range-shooting', 'help-defense',
    'plyometrics', 'pick-and-roll',
  ],
  'ava-kim': ['sleep-hygiene'],
  'caleb-monroe': [
    'sleep-hygiene', 'joint-mobility', 'aerobic-base',
    'core-stability', 'anaerobic-capacity',
    'ball-handling', 'defensive-stance',
  ],
}

export const INITIAL_ATHLETE_READINESS: Record<string, number> = {
  // Baseball
  'jordan-martinez': 100,
  'aiden-chen': 85,
  'marcus-johnson': 90,
  'sofia-rodriguez': 95,
  'jaylen-williams': 60,
  'emma-davis': 100,
  'tyler-brooks': 45,
  'mia-thompson': 100,
  'derek-washington': 75,
  'kayla-foster': 80,
  // Basketball
  'malik-rivers': 90,
  'priya-patel': 100,
  'dante-collins': 85,
  'ava-kim': 100,
  'caleb-monroe': 70,
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
}
