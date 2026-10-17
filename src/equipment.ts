import type { EquipKind, EquipUse, Exercise, Gear, Profile } from './types'

/** Kept apart from engine.ts so the equipment screens and the engine share one set of rules. */
export const gearRank: Record<Gear, number> = { gym: 2, db: 1, bw: 0 }
export const GEAR_NAME: Record<Gear, string> = { gym: 'Full gym', db: 'Dumbbells only', bw: 'Bodyweight' }

/** `gear` is the least equipment a person needs for it: barbells, machines and cables need a full gym, and so on. */
export const EQUIP_KINDS: { id: EquipKind; label: string; hint: string; gear: Gear }[] = [
  { id: 'barbell', label: 'Barbells', hint: 'Squats, bench, deadlifts, rows', gear: 'gym' },
  { id: 'dumbbell', label: 'Dumbbells', hint: 'Presses, curls, rows, lunges', gear: 'db' },
  { id: 'machine', label: 'Machines', hint: 'Leg press, chest press, leg curls', gear: 'gym' },
  { id: 'cable', label: 'Cables', hint: 'Pushdowns, rows, pulldowns, flys', gear: 'gym' },
  { id: 'bodyweight', label: 'Bodyweight', hint: 'Push-ups, pull-ups, planks, lunges', gear: 'bw' },
  { id: 'ezbar', label: 'EZ bar', hint: 'Curls and skull crushers', gear: 'gym' },
  { id: 'kettlebells', label: 'Kettlebells', hint: 'Swings, goblet moves, get-ups', gear: 'db' },
  { id: 'bands', label: 'Resistance bands', hint: 'Pull-aparts, banded walks', gear: 'bw' },
]

/** The hand-tuned exercises don't name their equipment, so it is listed here. */
const CORE: Record<string, EquipKind> = {
  bench: 'barbell', row: 'barbell', squat: 'barbell', deadlift: 'barbell',
  incdb: 'dumbbell', ohtri: 'dumbbell', latraise: 'dumbbell', latraise2: 'dumbbell', dbrow: 'dumbbell', dbcurl: 'dumbbell', hammer: 'dumbbell',
  goblet: 'dumbbell', rdl: 'dumbbell', dbpress: 'dumbbell', reardelt: 'dumbbell', shrug: 'dumbbell', fbdb: 'dumbbell', fbpress: 'dumbbell', fbdbrow: 'dumbbell', fbcurl: 'dumbbell',
  chestmach: 'machine', csrow: 'machine', legpress: 'machine', legcurl: 'machine', legext: 'machine', fbrow: 'machine',
  cablefly: 'cable', pushdown: 'cable', cablerow: 'cable', pulldown: 'cable', facepull: 'cable', cablecrunch: 'cable',
  pushup: 'bodyweight', dips: 'bodyweight', pullup: 'bodyweight', lunge: 'bodyweight', calf: 'bodyweight', legraise: 'bodyweight', plank: 'bodyweight', fblunge: 'bodyweight', fbpush: 'bodyweight',
}
/** What the bigger library calls its equipment. */
const LIB: Record<string, EquipKind> = {
  barbell: 'barbell', dumbbell: 'dumbbell', machine: 'machine', cable: 'cable', 'body only': 'bodyweight',
  'e-z curl bar': 'ezbar', kettlebells: 'kettlebells', bands: 'bands',
}

const fromGear = (x: Exercise): EquipKind => (x.gear === 'gym' ? 'machine' : x.gear === 'db' ? 'dumbbell' : 'bodyweight')
export const equipKind = (x: Exercise): EquipKind => (x.equip ? LIB[x.equip] : CORE[x.id]) ?? fromGear(x)

/**
 * What each kind starts as before the person has said anything. A full-gym lifter gets the gym's equipment, with
 * bodyweight and the EZ bar now and then (a push-up here and there is fine). Kettlebells and bands start off, because
 * most gym-goers never touch them, and the equipment screen says so: people who do use them switch them on.
 */
export function defaultUse(gear: Gear, kind: EquipKind): EquipUse {
  if (kind === 'kettlebells' || kind === 'bands') return 'never'
  if (kind === 'bodyweight') return gear === 'gym' ? 'sometimes' : 'often'
  if (kind === 'ezbar') return 'sometimes'
  return 'often'
}

export const kindUse = (p: Pick<Profile, 'gear' | 'equip'>, kind: EquipKind): EquipUse => p.equip?.[kind] ?? defaultUse(p.gear, kind)
export const equipUse = (p: Pick<Profile, 'gear' | 'equip'>, x: Exercise): EquipUse => kindUse(p, equipKind(x))

/** Is this kind out of reach because of the equipment they chose (Full gym, Dumbbells only, Bodyweight)? */
export const beyondGear = (p: Pick<Profile, 'gear'>, kind: EquipKind) => gearRank[EQUIP_KINDS.find((k) => k.id === kind)!.gear] > gearRank[p.gear]

export const useLabel: Record<EquipUse, string> = { often: 'Often', sometimes: 'Sometimes', never: 'Never' }
