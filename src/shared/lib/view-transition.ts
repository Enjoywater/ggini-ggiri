/**
 * Page depth map for determining slide direction.
 * Higher depth = deeper in the navigation hierarchy.
 */
const PAGE_DEPTH: Record<string, number> = {
  '/': 0,
  '/history': 1,
  '/settings': 1,
  '/settlement': 1,
  '/detail': 2,
};

function getDepth(path: string): number {
  return PAGE_DEPTH[path] ?? 1;
}

/**
 * Wraps a navigation callback with View Transitions API.
 * Adds a 'slide-back' class to <html> when navigating to a shallower page.
 * Falls back to immediate navigation if View Transitions API is unsupported.
 */
export function navigateWithTransition(
  toPath: string,
  callback: () => void,
): void {
  if (
    typeof document === 'undefined' ||
    !('startViewTransition' in document)
  ) {
    callback();
    return;
  }

  const currentPath = window.location.pathname;
  const currentDepth = getDepth(currentPath);
  const targetDepth = getDepth(toPath);
  const isBack = targetDepth < currentDepth;

  const html = document.documentElement;
  if (isBack) {
    html.classList.add('slide-back');
  } else {
    html.classList.remove('slide-back');
  }

  document.startViewTransition(() => {
    callback();
  });
}
