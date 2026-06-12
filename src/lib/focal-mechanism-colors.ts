export function getFocalDepthColor(depthKm: number): string {
  if (depthKm < 60) return '#ff0000'
  if (depthKm <= 300) return '#ffff00'
  return '#00ff00'
}
