const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export function DaysIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4M8 14l2 2 4-4" />
    </svg>
  );
}

export function PrepIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M8.5 10h7M8.5 14h7M8.5 18h4" />
    </svg>
  );
}

export function SpotsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
      <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

export function CountryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5S9.5 6.1 12 3.5Z" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
      <circle cx="12" cy="5.5" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="18.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
      <path d="M10.5 13.5 3 11l1.5-1.5 8 .5 4-4.5a2 2 0 0 1 3 3l-4.5 4 .5 8L14 21l-2.5-7.5" />
      <path d="M6 18l2-2" />
    </svg>
  );
}

export function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}

export function TickIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...common} strokeWidth={2.4}>
      <path d="M5 12l4 4 10-10" />
    </svg>
  );
}
