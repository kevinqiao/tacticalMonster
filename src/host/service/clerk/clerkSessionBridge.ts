/** Lets UserManager (outside ClerkProvider) trigger Clerk sign-out. */

const PARTNER_SWITCH_BLOCK_KEY = "clerk_block_auto_exchange";

let clerkSignOutFn: (() => Promise<void>) | null = null;
/** In-memory suppress while a sign-out is in flight. */
let suppressAutoExchange = false;

function readPartnerSwitchBlock(): boolean {
  try {
    return sessionStorage.getItem(PARTNER_SWITCH_BLOCK_KEY) === "1";
  } catch {
    return false;
  }
}

function writePartnerSwitchBlock(on: boolean): void {
  try {
    if (on) sessionStorage.setItem(PARTNER_SWITCH_BLOCK_KEY, "1");
    else sessionStorage.removeItem(PARTNER_SWITCH_BLOCK_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}

export function registerClerkSignOut(fn: () => Promise<void>): () => void {
  clerkSignOutFn = fn;
  return () => {
    if (clerkSignOutFn === fn) clerkSignOutFn = null;
  };
}

export function shouldSuppressClerkAutoExchange(): boolean {
  return suppressAutoExchange || readPartnerSwitchBlock();
}

/** Clear all auto-exchange blocks (call when user intentionally opens sign-in). */
export function clearClerkAutoExchangeSuppress(): void {
  suppressAutoExchange = false;
  writePartnerSwitchBlock(false);
}

/**
 * Clear only the in-flight sign-out suppress.
 * Keeps the partner-switch sessionStorage block so Clerk cannot silently
 * re-mint a JWT for the new URL partner after PartnerSessionGuard logout.
 */
export function clearTransientClerkAutoExchangeSuppress(): void {
  suppressAutoExchange = false;
}

/**
 * After URL partner mismatch logout: block ClerkPlatformBridge auto-exchange
 * until the user explicitly opens SSO (askAuth / forceReauth).
 */
export function blockClerkAutoExchangeAfterPartnerSwitch(): void {
  suppressAutoExchange = true;
  writePartnerSwitchBlock(true);
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
