export function readInjectedPartnerEmbedToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.__PARTNER_AUTH__?.token;
  return typeof token === "string" && token.trim() ? token.trim() : null;
}

/** Signals that Partner embed handoff is expected (WebView / iframe / ?embed=1). */
export function isEmbedLikelyContext(
  search = typeof window !== "undefined" ? window.location.search : ""
): boolean {
  if (readInjectedPartnerEmbedToken()) return true;
  const params = new URLSearchParams(search);
  if (params.get("embed") === "1" || params.get("partner_embed") === "1") return true;
  if (typeof window === "undefined") return false;
  try {
    return window.parent !== window;
  } catch {
    return true;
  }
}
