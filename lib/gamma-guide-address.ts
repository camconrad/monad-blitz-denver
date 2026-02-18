/**
 * GammaGuide contract address (set after deployment).
 * Set NEXT_PUBLIC_GAMMA_GUIDE_ADDRESS in env.
 */
export function getGammaGuideAddress(): `0x${string}` | undefined {
  const a = process.env.NEXT_PUBLIC_GAMMA_GUIDE_ADDRESS;
  if (!a || !a.startsWith('0x')) return undefined;
  return a as `0x${string}`;
}
