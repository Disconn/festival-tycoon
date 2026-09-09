/** Keep the same logical pixel canvas at Full HD, 4K and high-DPI browser zoom. */
export function scenePixelRatio(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 0.75
  return Math.min(0.75, 1440 / width, 810 / height)
}
