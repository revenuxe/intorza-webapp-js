declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Sends a standard Meta Pixel event after a completed user action. */
export function trackMetaEvent(event: string) {
  if (typeof window !== "undefined") window.fbq?.("track", event);
}
