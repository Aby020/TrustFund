import { useMediaQuery } from './use-media-query';

/** True when the user prefers reduced motion. Used to skip transitions. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}