import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>
const base = (p: P) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
})

export const PlayIcon = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.1-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" /></svg>
)
export const PauseIcon = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><rect x="6" y="4.5" width="4" height="15" rx="1.2" /><rect x="14" y="4.5" width="4" height="15" rx="1.2" /></svg>
)
export const PrevIcon = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><path d="M18 6.4v11.2a1 1 0 0 1-1.55.83L8.6 13.23a1.5 1.5 0 0 1 0-2.46l7.85-5.2A1 1 0 0 1 18 6.4ZM6 5a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1Z" /></svg>
)
export const NextIcon = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none"><path d="M6 6.4v11.2a1 1 0 0 0 1.55.83l7.85-5.2a1.5 1.5 0 0 0 0-2.46l-7.85-5.2A1 1 0 0 0 6 6.4ZM18 5a1 1 0 0 0-1 1v12a1 1 0 1 0 2 0V6a1 1 0 0 0-1-1Z" /></svg>
)
export const PlusIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
)
export const SearchIcon = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)
export const HeartIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? 'currentColor' : 'none'}><path d="M19.5 12.57 12 20l-7.5-7.43A5 5 0 1 1 12 6.01a5 5 0 1 1 7.5 6.56Z" /></svg>
)
export const StarIcon = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? 'currentColor' : 'none'}><path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8Z" /></svg>
)
export const CloseIcon = (p: P) => (
  <svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>
)
export const UploadIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 15V3m0 0-4.5 4.5M12 3l4.5 4.5M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" /></svg>
)
export const ImageIcon = (p: P) => (
  <svg {...base(p)}><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-4.5-4.5L5 21" /></svg>
)
export const TrashIcon = (p: P) => (
  <svg {...base(p)}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6" /></svg>
)
export const DownloadIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" /></svg>
)
export const FilterIcon = (p: P) => (
  <svg {...base(p)}><path d="M4 6h16M7 12h10M10 18h4" /></svg>
)
export const CheckIcon = (p: P) => (
  <svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
)
export const CopyIcon = (p: P) => (
  <svg {...base(p)}><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" /></svg>
)
export const ExternalIcon = (p: P) => (
  <svg {...base(p)}><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></svg>
)
export const MailIcon = (p: P) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></svg>
)
export const PinIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
)
export const SendIcon = (p: P) => (
  <svg {...base(p)}><path d="M21 3 10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3Z" /></svg>
)
export const LogoMark = (p: P) => (
  <svg {...base(p)} viewBox="0 0 32 32" stroke="none">
    <defs>
      <linearGradient id="dv-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#F8E7A6" />
        <stop offset=".45" stopColor="#D4AF37" />
        <stop offset=".75" stopColor="#9C7A1E" />
        <stop offset="1" stopColor="#F1D57E" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="9" fill="#0B0B0C" />
    <rect x=".75" y=".75" width="30.5" height="30.5" rx="8.4" fill="none" stroke="url(#dv-gold)" strokeWidth="1.5" />
    <g fill="url(#dv-gold)">
      <rect x="7" y="13" width="3" height="6" rx="1.5" />
      <rect x="12" y="9" width="3" height="14" rx="1.5" />
      <rect x="17" y="6" width="3" height="20" rx="1.5" />
      <rect x="22" y="11" width="3" height="10" rx="1.5" />
    </g>
  </svg>
)
