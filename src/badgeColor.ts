import type { CSSProperties } from 'react'
import { hash } from './engine'

/**
 * Badges each get their own colour. It looks random but is worked out from the badge's name, so Tennis is the same colour on every
 * phone and every visit (a colour that changed on each look would flicker). The hues are picked to sit well on the dark screens.
 */
const HUES = [8, 32, 52, 95, 145, 175, 200, 225, 262, 292, 328]
export const badgeHue = (name: string) => HUES[hash(name) % HUES.length]
/** The `--bh` hue the badge styles read: tinted background and border, and a lighter text or icon colour. */
export const badgeStyle = (name: string): CSSProperties => ({ '--bh': badgeHue(name) } as CSSProperties)
