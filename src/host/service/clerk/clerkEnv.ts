import { shouldSkipClerkOnCrazyGamesHost } from "../platformAuth/embedSources/crazyGamesHost";

/** Clerk publishable key (Vite). Set via `clerk env pull` or `.env.local`. */
export function getClerkPublishableKey(): string {
  return (
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
    import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    import.meta.env.REACT_APP_CLERK_PUBLISHABLE_KEY ||
    import.meta.env.CLERK_PUBLISHABLE_KEY ||
    ""
  ).trim();
}

/** True when a publishable key is present in the build (ignores host policy). */
export function isClerkConfigured(): boolean {
  return getClerkPublishableKey().length > 0;
}

/**
 * True when Clerk may mount `ClerkProvider` / call `useAuth`.
 * CrazyGames CDN builds skip Clerk (origin keys reject those hosts; auth is embed JWT).
 * Pack scripts can also set `VITE_DISABLE_CLERK=1` to strip Clerk from embed builds.
 */
export function isClerkEnabled(): boolean {
  const disabled = String(import.meta.env.VITE_DISABLE_CLERK ?? "")
    .trim()
    .toLowerCase();
  if (disabled === "1" || disabled === "true") return false;
  return isClerkConfigured() && !shouldSkipClerkOnCrazyGamesHost();
}

/** Linked Clerk application (see `.clerk/link.json` from `clerk link --app …`). */
export const CLERK_APPLICATION_ID = "app_3Fojpg8n34wLhLwKalH8nPAjhLy";
