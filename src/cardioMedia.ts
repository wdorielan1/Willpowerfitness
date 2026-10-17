import type { IconName } from './icons'
import { sportOf } from './sports'

// Cardio pictures come from the same free-exercise-db project (public domain / Unlicense) as the lift photos:
// https://github.com/yuhonas/free-exercise-db  Two frames each, flipped like the Motion preview on a lift.
// Only entries where the photos really show the activity are used. The database's Bicycling, Skating and Air Bike
// entries show a helmet being buckled and an ab crunch, so they are left out.
export const CARDIO_PICTURES: Record<string, string> = {
  'walking-treadmill': 'Treadmill walk',
  'running-treadmill': 'Treadmill run',
  stairmaster: 'StairMaster',
  elliptical: 'Elliptical',
  'stationary-bike': 'Stationary bike',
  trail: 'Trail run or walk',
  'jump-rope': 'Jump rope',
  'rowing-machine': 'Rowing machine',
}

/** The picture for a machine (the treadmill's mode picks walk or run) or an activity, if the database has one. */
export function pictureFor(kind: string, mode?: string): { slug: string; name: string } | null {
  let slug: string | undefined
  switch (kind) {
    case 'Treadmill': slug = mode === 'Run' || mode === 'Sprints' ? 'running-treadmill' : 'walking-treadmill'; break
    case 'StairMaster': slug = 'stairmaster'; break
    case 'Elliptical': slug = 'elliptical'; break
    case 'Bike': case 'Spin class': slug = 'stationary-bike'; break
    case 'Outdoor walk': case 'Running (outdoors)': case 'Trail running': case '5K/10K race': slug = 'trail'; break
    case 'Jump rope': slug = 'jump-rope'; break
    case 'Rowing machine': slug = 'rowing-machine'; break
  }
  return slug ? { slug, name: CARDIO_PICTURES[slug] } : null
}
export const pictureUrl = (slug: string, frame: 0 | 1) => `${import.meta.env.BASE_URL}cardio/${slug}-${frame}.jpg`

/** One icon per activity group, for the activities that have no picture. */
export const CATEGORY_ICON: Record<string, IconName> = {
  'Racquet and paddle': 'racquet',
  'Team sports': 'ball',
  'Walking sports': 'flag',
  'Running and track': 'track',
  Water: 'waves',
  Winter: 'snow',
  Wheels: 'wheel',
  Combat: 'glove',
  'Gym and studio': 'weight',
  'Mind and body': 'lotus',
  Dance: 'note',
  'Climbing and outdoors': 'mountain',
  Other: 'sparkle',
}
export const iconFor = (kind: string): IconName | null => { const s = sportOf(kind); return s ? CATEGORY_ICON[s.cat] ?? null : null }
