let pending: Promise<boolean> | null = null;

/**
 * Single-flight guard: concurrent 401s share one in-flight rotate call
 * instead of each starting their own.
 */
export function rotateOnce(performRotate: () => Promise<boolean>): Promise<boolean> {
  pending ??= performRotate().finally(() => {
    pending = null;
  });
  return pending;
}
