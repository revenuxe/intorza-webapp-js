// Payment return URLs and browser storage must never redirect to another origin.
export function safeInternalPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return fallback;
  try {
    const base = "https://intorza.invalid";
    const target = new URL(value, base);
    return target.origin === base ? target.pathname + target.search + target.hash : fallback;
  } catch { return fallback; }
}
