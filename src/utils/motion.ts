export function prefersReducedMotion(
  media: Pick<Window, 'matchMedia'> | undefined = typeof window === 'undefined' ? undefined : window,
): boolean {
  if (!media?.matchMedia) return false;
  try {
    return media.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
