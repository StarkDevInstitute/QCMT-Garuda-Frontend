// Beach ball geometry utilities (Aki & Richards convention)
// NED coordinate system: x₁=North, x₂=East, x₃=Down
// Strike φ_s: clockwise from North (0–360°)
// Dip δ: downward from horizontal (0–90°)
// Rake λ: counterclockwise from strike (−180–180°)

const DEG = Math.PI / 180

/** Fault normal vector in NED (pointing away from hanging wall) */
export function faultNormal(strikeDeg: number, dipDeg: number): [number, number, number] {
  const s = strikeDeg * DEG
  const d = dipDeg * DEG
  return [
    -Math.sin(d) * Math.sin(s),   // North
     Math.sin(d) * Math.cos(s),   // East
    -Math.cos(d),                 // Down
  ]
}

/** Slip vector in NED (direction of motion of hanging wall relative to foot wall) */
export function slipVector(strikeDeg: number, dipDeg: number, rakeDeg: number): [number, number, number] {
  const s = strikeDeg * DEG
  const d = dipDeg * DEG
  const r = rakeDeg * DEG
  return [
    Math.cos(r) * Math.cos(s) + Math.cos(d) * Math.sin(r) * Math.sin(s),   // North
    Math.cos(r) * Math.sin(s) - Math.cos(d) * Math.sin(r) * Math.cos(s),   // East
   -Math.sin(d) * Math.sin(r),                                              // Down
  ]
}

/** P-wave radiation sign at unit direction γ (NED) using double-couple formula:
 *  A = (n̂·γ)(l̂·γ)   > 0 → compression (dark), < 0 → dilatation (white) */
export function radiationSign(
  n: [number, number, number],
  l: [number, number, number],
  gamma: [number, number, number]
): number {
  const dotNGamma = n[0]*gamma[0] + n[1]*gamma[1] + n[2]*gamma[2]
  const dotLGamma = l[0]*gamma[0] + l[1]*gamma[1] + l[2]*gamma[2]
  return dotNGamma * dotLGamma
}

/** Lambert equal-area lower-hemisphere projection.
 *  Takes azimuth φ (from N, clockwise) and take-off angle θ (from vertical down).
 *  Returns (x, y) where x is East (+right) and y is North (+up), both in [−1, 1]. */
export function lowerHemisphere(azimuthDeg: number, takeoffDeg: number): [number, number] {
  const phi = azimuthDeg * DEG
  const theta = takeoffDeg * DEG
  const r = Math.SQRT2 * Math.sin(theta / 2)
  return [r * Math.sin(phi), r * Math.cos(phi)]  // [east, north]
}

/** Inverse: given plot coords (x=east, y=north) → unit vector in NED */
export function plotToNED(x: number, y: number): [number, number, number] | null {
  const r2 = x * x + y * y
  if (r2 > 1.0) return null  // outside hemisphere
  // Lambert equal-area: r = √2 * sin(θ/2) → θ = 2*arcsin(r/√2)
  const r = Math.sqrt(r2)
  const theta = 2 * Math.asin(r / Math.SQRT2)
  const phi = Math.atan2(x, y)  // atan2(east, north) = azimuth
  return [
    Math.sin(theta) * Math.cos(phi),  // North
    Math.sin(theta) * Math.sin(phi),  // East
    Math.cos(theta),                  // Down
  ]
}
