export interface Sport { name: string; cat: string; /** extra words the search matches */ also?: string[]; /** shown first in the picker */ popular?: boolean; /** distance is worth logging (walking sports, running, riding), so the form offers miles */ miles?: boolean }

const s = (cat: string, items: (string | Omit<Sport, 'cat'>)[]): Sport[] => items.map((i) => ({ cat, ...(typeof i === 'string' ? { name: i } : i) }))

/**
 * Sessions with no machine: sports, classes and outdoor activities. Picked from "More activities" on the Cardio page, saved as the session's
 * kind, so a session just says "Tennis". The names are close to what an Apple Watch reports, so a watch can fill them in later.
 */
export const SPORTS: Sport[] = [
  ...s('Racquet and paddle', [{ name: 'Tennis', popular: true }, { name: 'Pickleball', popular: true }, 'Padel', 'Badminton', 'Squash', 'Racquetball', { name: 'Table tennis', also: ['ping pong'] }]),
  ...s('Team sports', [{ name: 'Basketball', popular: true }, { name: 'Soccer', popular: true, also: ['football'] }, 'Volleyball', 'Beach volleyball', 'Flag football', { name: 'Football', also: ['american football'] }, 'Baseball', 'Softball', 'Rugby', 'Lacrosse', 'Ice hockey', 'Field hockey', 'Cricket', 'Handball', { name: 'Ultimate frisbee', also: ['disc'] }, 'Kickball', 'Dodgeball', 'Netball']),
  ...s('Walking sports', [{ name: 'Golf', popular: true, miles: true }, { name: 'Disc golf', miles: true }, { name: 'Hiking', popular: true, miles: true, also: ['trail', 'walk'] }, { name: 'Rucking', miles: true, also: ['weighted walk'] }, { name: 'Dog walk', miles: true }, { name: 'Power walking', miles: true }]),
  ...s('Running and track', [{ name: 'Running (outdoors)', popular: true, miles: true, also: ['run', 'jog', 'jogging'] }, { name: 'Trail running', miles: true }, 'Track workout', 'Sprint intervals', { name: '5K/10K race', miles: true, also: ['race', '5k', '10k', 'marathon'] }, 'Track and field']),
  ...s('Water', [{ name: 'Swimming', popular: true, also: ['laps', 'pool'] }, 'Open-water swimming', 'Surfing', 'Kayaking', 'Canoeing', { name: 'Paddleboarding', also: ['sup'] }, { name: 'Rowing (on water)', also: ['crew'] }, 'Water aerobics', 'Water polo']),
  ...s('Winter', ['Downhill skiing', 'Cross-country skiing', 'Snowboarding', 'Ice skating', 'Snowshoeing']),
  ...s('Wheels', [{ name: 'Cycling (outdoors)', popular: true, miles: true, also: ['bike', 'bicycle', 'road cycling'] }, { name: 'Mountain biking', miles: true }, { name: 'Spin class', also: ['spinning', 'cycle'] }, { name: 'Inline skating', miles: true, also: ['rollerblading'] }, { name: 'Roller skating', miles: true }, 'Skateboarding']),
  ...s('Combat', [{ name: 'Boxing', popular: true }, 'Kickboxing', 'Muay Thai', { name: 'Brazilian jiu-jitsu', also: ['bjj', 'jiu jitsu'] }, 'Judo', 'Karate', 'Taekwondo', 'Wrestling', 'Fencing', { name: 'MMA', also: ['mixed martial arts'] }, 'Shadowboxing']),
  ...s('Gym and studio', [{ name: 'HIIT', popular: true, also: ['intervals', 'high intensity'] }, 'Circuit training', { name: 'Boot camp', also: ['bootcamp'] }, 'CrossFit', { name: 'Cardio dance', also: ['zumba'] }, 'Step aerobics', { name: 'Jump rope', also: ['skipping'] }, { name: 'Stair climbing', also: ['stairs'] }, { name: 'Rowing machine', also: ['erg', 'row'] }, 'Assault bike', 'Ski erg', 'Battle ropes']),
  ...s('Mind and body', [{ name: 'Yoga', popular: true }, 'Pilates', 'Barre', 'Tai chi']),
  ...s('Dance', ['Social dance', 'Ballroom', 'Hip-hop']),
  ...s('Climbing and outdoors', [{ name: 'Rock climbing', also: ['climb'] }, 'Bouldering', 'Horseback riding', 'Parkour', 'Gymnastics']),
  ...s('Other', ['Bowling', 'Archery', 'Playing with kids', 'Yard work', { name: 'Stretching and mobility', also: ['stretch', 'foam rolling'] }]),
]

export const SPORT_CATEGORIES = [...new Set(SPORTS.map((x) => x.cat))]
export const POPULAR_SPORTS = SPORTS.filter((x) => x.popular)
export const sportOf = (name: string) => SPORTS.find((x) => x.name === name)

/** Search by name, other names people use, or the group (like "water"). */
export function findSports(query: string): Sport[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return SPORTS.filter((x) => x.name.toLowerCase().includes(q) || x.cat.toLowerCase().includes(q) || (x.also ?? []).some((a) => a.includes(q)))
}
