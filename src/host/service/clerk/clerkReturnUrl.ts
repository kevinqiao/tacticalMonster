/** Current page URL (no hash) — Clerk OAuth return, sign-out, and post-auth redirects. */
export function clerkReturnUrl(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
}

export function isClerkSsoCallbackHash(): boolean {
  if (typeof window === "undefined") return false;
  return /sso-callback/i.test(window.location.hash);
}

export function clearClerkHashFromUrl(): void {
  if (typeof window === "undefined") return;
  const next = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, "", next);
}
