import { normalizePageUri } from "@/host/util/PageUtils";
import {
  type BootShellId,
  resolveBootShellIdFromPathname,
} from "./bootShellThemes";

/** Keep in sync with `<title>` in `index.html`. */
export const DEFAULT_DOCUMENT_TITLE = "Match 3";

const TITLE_BY_SHELL: Record<BootShellId, string> = {
  portal: "Branwar Games",
  tactical: "Tactical Lobby",
  casual: "Casual Lobby",
  campaign: "PlayMint",
  partnerOperation: "Partner Operation",
  platform: "Platform Admin",
  partner: "Partner Admin",
};

/** Exact path overrides (checked before shell fallback). */
const TITLE_BY_EXACT_PATH: Record<string, string> = {
  "/campaign/home":
    "PlayMint — Merchant activity hub + Wallet reminders for local shops.",
};

export function resolveDocumentTitle(
  pathname = typeof window !== "undefined" ? window.location.pathname : ""
): string {
  const path = normalizePageUri(pathname);
  const exact = TITLE_BY_EXACT_PATH[path];
  if (exact) return exact;
  return TITLE_BY_SHELL[resolveBootShellIdFromPathname(path)] ?? DEFAULT_DOCUMENT_TITLE;
}

export function applyDocumentTitle(pathname?: string): void {
  if (typeof document === "undefined") return;
  document.title = resolveDocumentTitle(pathname);
}
