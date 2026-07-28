// ─── SCMTV GFZ Color Conventions ─────────────────────────────────────────────

import type { DistanceGroup, PhaseType, ComponentType } from '@/types/waveform'

// ─── Distance Group Colors ───────────────────────────────────────────────────

export const DISTANCE_GROUP_COLORS: Record<DistanceGroup, string> = {
  local: '#FF8C42',       // Orange - Epicentral distance < 3°
  regional: '#4CAF50',    // Green - Epicentral distance 3-10°
  teleseismic: '#42A5F5', // Blue - Epicentral distance > 10°
}

export const DISTANCE_GROUP_BG: Record<DistanceGroup, string> = {
  local: '#FF8C4215',       // Orange - 8% opacity
  regional: '#4CAF5015',    // Green - 8% opacity
  teleseismic: '#42A5F515', // Blue - 8% opacity
}

export function getDistanceGroup(distance: number): DistanceGroup {
  if (distance < 3) return 'local'
  if (distance <= 10) return 'regional'
  return 'teleseismic'
}

// ─── Phase Colors (from SCMTV GFZ) ───────────────────────────────────────────

export const PHASE_COLORS: Record<PhaseType, string> = {
  P: '#FF8C42',          // Orange
  S: '#00BCD4',          // Cyan
  Rayleigh: '#4CAF50',   // Green
  Love: '#9CCC65',       // Lime
}

export const PHASE_COLORS_ALPHA: Record<PhaseType, string> = {
  P: '#FF8C4230',        // Orange - 20% opacity for window backgrounds
  S: '#00BCD430',        // Cyan
  Rayleigh: '#4CAF5030', // Green
  Love: '#9CCC6530',     // Lime
}

// ─── Component Colors (Z/R/T seismic traces) ─────────────────────────────────

export const COMPONENT_COLORS: Record<ComponentType, string> = {
  Z: '#1E88E5',   // Blue - Vertical component
  R: '#43A047',   // Green - Radial component
  T: '#E53935',   // Red - Transverse component
}

// ─── Fit Quality Colors (from SCMTV GFZ beach ball) ─────────────────────────

export function getFitQualityColor(fit: number): string {
  if (fit >= 80) return '#4CAF50' // Green - Excellent fit (≥80%)
  if (fit >= 40) return '#FFC107' // Yellow - Medium fit (40-80%)
  return '#EF5350'                 // Red - Poor fit (<40%)
}

export function getFitQualityBg(fit: number): string {
  if (fit >= 80) return '#4CAF5015' // Green - 8% opacity
  if (fit >= 40) return '#FFC10715' // Yellow
  return '#EF535015'                 // Red
}

// ─── Waveform Trace Colors (Observed vs Synthetic) ───────────────────────────

export const TRACE_COLORS = {
  observed: '#000000',   // Black - Observed waveform (dark theme)
  synthetic: '#E53935',  // Red - Synthetic waveform
  observedLight: '#000000', // Black - Light theme
  observedDark: '#FFFFFF',  // White - Dark theme
}

// ─── Station Table Status Colors ─────────────────────────────────────────────

export const STATUS_COLORS = {
  selected: '#4CAF50',       // Green - Used in inversion
  unselected: '#9E9E9E',     // Gray - Available but not used
  excluded: '#EF5350',       // Red - Excluded from inversion
  active: '#42A5F5',         // Blue - Currently active/selected
}

// ─── Grid & UI Elements ──────────────────────────────────────────────────────

export const GRID_COLORS = {
  major: '#E0E0E0',         // Major gridlines (light theme)
  minor: '#F5F5F5',         // Minor gridlines (light theme)
  majorDark: '#424242',     // Major gridlines (dark theme)
  minorDark: '#303030',     // Minor gridlines (dark theme)
}

// ─── Residual Plot Colors ────────────────────────────────────────────────────

export const RESIDUAL_COLORS = {
  positive: '#E53935',      // Red - Positive residual (synthetic > observed)
  negative: '#1E88E5',      // Blue - Negative residual (synthetic < observed)
  neutral: '#757575',       // Gray - Zero residual
}
