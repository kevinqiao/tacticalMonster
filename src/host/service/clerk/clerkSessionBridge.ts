/** Lets UserManager (outside ClerkProvider) trigger Clerk sign-out. */
let clerkSignOutFn: (() => Promise<void>) | null = null;
let suppressAutoExchange = false;

export function registerClerkSignOut(fn: () => Promise<void>): () => void {
  clerkSignOutFn = fn;
  return () => {
    if (clerkSignOutFn === fn) clerkSignOutFn = null;
  };
}

export function shouldSuppressClerkAutoExchange(): boolean {
  return suppressAutoExchange;
}

export function clearClerkAutoExchangeSuppress(): void {
  suppressAutoExchange = false;
}

/** Sign out Clerk session and block platform JWT re-exchange until Clerk is cleared. */
export async function signOutClerkSession(): Promise<void> {
  suppressAutoExchange = true;
  if (!clerkSignOutFn) return;

  try {
    await clerkSignOutFn();
  } catch (err) {
    console.warn("[signOutClerkSession]", err);
  }
}
