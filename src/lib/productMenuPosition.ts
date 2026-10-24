/**
 * Keep suggestions outside the input and inside the keyboard-visible viewport.
 *
 * Position against the browser's visible viewport while keeping enough room
 * for the menu to remain useful when the input is close to an edge.
 */
export function productMenuPosition(rect: { top: number; bottom: number; left: number; width: number }, viewport: { top: number; left: number; width: number; height: number }, headerBottom = 0) {
  const gap = 6, edge = 8;
  const topEdge = Math.max(viewport.top, headerBottom) + edge;
  const bottomEdge = viewport.top + viewport.height - edge;
  const leftEdge = viewport.left + edge;
  const width = Math.min(rect.width, Math.max(0, viewport.width - edge * 2));
  const left = Math.max(leftEdge, Math.min(rect.left, viewport.left + viewport.width - edge - width));
  const belowAnchor = Math.max(rect.bottom, topEdge);
  const aboveAnchor = Math.min(rect.top, bottomEdge);
  const below = Math.max(0, bottomEdge - belowAnchor - gap);
  const above = Math.max(0, aboveAnchor - topEdge - gap);
  const upwards = below < 140 && above > below;
  // Keep enough room for the header and at least one result on short keyboard
  // viewports. The menu itself scrolls when its contents are longer.
  const maxHeight = Math.min(320, upwards ? above : below);
  return { position: 'fixed' as const, top: upwards ? aboveAnchor - gap : belowAnchor + gap, left, width, maxHeight,
    transform: upwards ? 'translateY(-100%)' : undefined,
    // The input may sit just outside the visible viewport while a browser is
    // scrolling or resizing. If there is room on either side, keep suggestions
    // available instead of hiding them due to a transient anchor coordinate.
    visibility: maxHeight < 64 ? 'hidden' as const : 'visible' as const,
    zIndex: 100,
  };
}
