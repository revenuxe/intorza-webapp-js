/**
 * Keep suggestions outside the input and inside the keyboard-visible viewport.
 *
 * In particular, never clamp a "below" menu upward: that makes it cover the
 * field on iOS when the keyboard has reduced `visualViewport.height`.
 */
export function productMenuPosition(rect: { top: number; bottom: number; left: number; width: number }, viewport: { top: number; left: number; width: number; height: number }, headerBottom = 0) {
  const gap = 6, edge = 8;
  const topEdge = Math.max(viewport.top, headerBottom) + edge;
  const bottomEdge = viewport.top + viewport.height - edge;
  const leftEdge = viewport.left + edge;
  const width = Math.min(rect.width, Math.max(0, viewport.width - edge * 2));
  const left = Math.max(leftEdge, Math.min(rect.left, viewport.left + viewport.width - edge - width));
  const below = Math.max(0, bottomEdge - rect.bottom - gap);
  const above = Math.max(0, rect.top - topEdge - gap);
  const upwards = below < 140 && above > below;
  const maxHeight = Math.min(320, upwards ? above : below);
  return { position: 'fixed' as const, top: upwards ? rect.top - gap : rect.bottom + gap, left, width, maxHeight,
    transform: upwards ? 'translateY(-100%)' : undefined,
    visibility: maxHeight < 64 || rect.top < topEdge - edge || rect.bottom > bottomEdge + edge ? 'hidden' as const : 'visible' as const,
    zIndex: 100,
  };
}
