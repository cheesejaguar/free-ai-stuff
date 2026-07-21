import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const iconDefaults = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function SearchIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...iconDefaults} {...props}>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.2 4.2" />
    </svg>
  )
}

export function ChevronIcon({ direction = 'down', ...props }: IconProps & { direction?: 'down' | 'up' }) {
  return (
    <svg viewBox="0 0 24 24" {...iconDefaults} {...props}>
      <path d={direction === 'down' ? 'm6 9 6 6 6-6' : 'm6 15 6-6 6 6'} />
    </svg>
  )
}

export function ExternalIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...iconDefaults} {...props}>
      <path d="M14 4h6v6" />
      <path d="m20 4-9 9" />
      <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
    </svg>
  )
}

export function FilterIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...iconDefaults} {...props}>
      <path d="M4 5h16l-6.3 7.2v5.7l-3.4 1.7v-7.4z" />
    </svg>
  )
}

export function MenuIcon({ open, ...props }: IconProps & { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" {...iconDefaults} {...props}>
      {open ? (
        <>
          <path d="m6 6 12 12" />
          <path d="M18 6 6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </>
      )}
    </svg>
  )
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...iconDefaults} {...props}>
      <path d="M12 3 5.5 5.7v5.5c0 4.5 2.7 7.8 6.5 9.8 3.8-2 6.5-5.3 6.5-9.8V5.7z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...iconDefaults} {...props}>
      <rect x="4" y="5.5" width="16" height="14.5" rx="1.5" />
      <path d="M8 3v5M16 3v5M4 10h16" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
    </svg>
  )
}

export function ArchiveIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...iconDefaults} {...props}>
      <path d="M4 7h16v13H4z" />
      <path d="M3 4h18v4H3zM9 12h6" />
    </svg>
  )
}
