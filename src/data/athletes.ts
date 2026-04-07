export interface Athlete {
  id: string
  displayName: string
  firstName: string
  age: number
  position: string
  schoolYear: string
  avatarUrl?: string
  avatarColor: string
  tagline: string
}

export const ATHLETES: Athlete[] = [
  {
    id: 'jordan-martinez',
    displayName: 'Jordan Martinez',
    firstName: 'Jordan',
    age: 15,
    position: 'Shortstop',
    schoolYear: 'Sophomore',
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
    avatarColor: '#14b8a6',
    tagline: 'Strong first baseman expanding to opposite-field hitting.',
  },
]

export const ATHLETE_BY_ID = Object.fromEntries(
  ATHLETES.map((a) => [a.id, a]),
) as Record<string, Athlete>

/** Mastery sets must be prerequisite-consistent with SKILL_DEFS */
export const INITIAL_ATHLETE_MASTERY: Record<string, string[]> = {
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
}

export const INITIAL_ATHLETE_READINESS: Record<string, number> = {
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
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
}
