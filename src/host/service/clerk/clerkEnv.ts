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

export function isClerkConfigured(): boolean {
  return getClerkPublishableKey().length > 0;
}

/** Linked Clerk application (see `.clerk/link.json` from `clerk link --app …`). */
export const CLERK_APPLICATION_ID = "app_3Fojpg8n34wLhLwKalH8nPAjhLy";
