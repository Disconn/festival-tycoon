/** Frame-rate-independent easing for visual transport poses; never advances simulation. */
export function transportMotionFactor(seconds: number): number {
  return 1 - Math.exp(-Math.max(0, seconds) / 0.16)
}
