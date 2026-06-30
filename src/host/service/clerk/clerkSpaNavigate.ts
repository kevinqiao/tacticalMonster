/** Clerk post-auth navigation without full page reload (same-origin SPA). */
export function clerkSpaNavigate(to: string): void {
  if (typeof window === "undefined") return;

  let dest: URL;
  try {
    dest = new URL(to, window.location.href);
  } catch {
    return;
  }

  if (dest.origin !== window.location.origin) {
    window.location.assign(dest.href);
    return;
  }

  const next = `${dest.pathname}${dest.search}${dest.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;

  const prevHash = window.location.hash;
  window.history.replaceState(null, "", next);

  if (prevHash !== dest.hash) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
}

export function clerkSpaNavigateAsync(to: string): Promise<void> {
  clerkSpaNavigate(to);
  return Promise.resolve();
}
