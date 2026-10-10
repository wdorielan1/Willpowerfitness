import type { ReactNode } from 'react'

const paths = {
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
  home: <path d="m3 10 9-7 9 7v10h-6v-6H9v6H3Z" />,
  weight: <path d="M2 8v8m4-11v14m12-14v14m4-11v8M6 12h12" />,
  crew: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2" /></>,
  chart: <path d="M3 3v18h18M7 15l4-5 4 3 6-8" />,
  food: <path d="M6 2v7m-3-7v5a3 3 0 0 0 6 0V2M6 10v12M18 2c-3 3-3 7-3 10h5V2h-2Zm2 10v10" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  back: <path d="m15 5-7 7 7 7" />,
  person: <><circle cx="12" cy="8" r="4" /><path d="M4 22v-2a8 8 0 0 1 16 0v2" /></>,
  plus: <path d="M12 4v16M4 12h16" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  photo: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 7" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 2v6M17 2v6M3 11h18" /></>,
  settings: <><path d="M3 6h18M3 12h18M3 18h18" /><circle cx="8" cy="6" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="9" cy="18" r="2" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
} satisfies Record<string, ReactNode>
export type IconName = keyof typeof paths
export function Icon({ name, size = 22, className }: { name: IconName; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>
}
