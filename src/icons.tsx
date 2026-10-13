import type { ReactNode } from 'react'

const paths = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  bell: <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8m4.3 12a2 2 0 0 0 3.4 0" />,
  comment: <path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12Z" />,
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
  upload: <path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5" />,
  download: <path d="M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5" />,
  copy: <><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></>,
  file: <path d="M14 2H4v20h16V8l-6-6Zm0 0v6h6M8 13h8m-8 4h6" />,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></>,
  video: <><rect x="2" y="6" width="14" height="12" rx="2" /><path d="m16 10 6-3v10l-6-3" /></>,
  play: <path d="M8 5v14l11-7Z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  photo: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m3 17 5-5 4 4 4-6 5 7" /></>,
  camera: <><path d="M3 7h4l2-3h6l2 3h4v13H3Z" /><circle cx="12" cy="13" r="4" /></>,
  flip: <path d="M4 8a8 8 0 0 1 14-3l3 3m-6 0h6V2M20 16a8 8 0 0 1-14 3l-3-3m6 0H3v6" />,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 2v6M17 2v6M3 11h18" /></>,
  settings: <><path d="M3 6h18M3 12h18M3 18h18" /><circle cx="8" cy="6" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="9" cy="18" r="2" /></>,
  close: <path d="m6 6 12 12M6 18 18 6" />,
} satisfies Record<string, ReactNode>
export type IconName = keyof typeof paths
export function Icon({ name, size = 22, className }: { name: IconName; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>
}
