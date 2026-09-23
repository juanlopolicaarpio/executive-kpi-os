// Chart tokens. Categorical hues are assigned to platforms in FIXED order and
// never cycled — a platform keeps its hue regardless of rank or filtering.
// Palette validated (light surface): worst adjacent CVD ΔE 47.2. Aqua/yellow sit
// below 3:1 contrast, so every chart using them ships DIRECT LABELS (the relief
// rule) — never color alone.

export const SERIES = {
  shopee: '#2a78d6', // slot 1 · blue
  lazada: '#1baf7a', // slot 2 · aqua
  tiktok: '#eda100', // slot 3 · yellow
} as const

/** Status tokens are reserved — never reused as a series colour. */
export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const

/** Recessive chrome: hairline grid/axis, one shade off the surface. */
export const CHROME = {
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
  ink: '#0b0b0b',
  secondary: '#52514e',
  surface: '#ffffff',
} as const

export const PLATFORM_LABEL: Record<string, string> = {
  shopee: 'Paid Search',
  lazada: 'Paid Social',
  'tiktok-shop': 'Affiliate',
}

export const PLATFORM_COLOR: Record<string, string> = {
  shopee: SERIES.shopee,
  lazada: SERIES.lazada,
  'tiktok-shop': SERIES.tiktok,
}
