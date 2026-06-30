export function partnerIdFromLocation(): number | null {
  const raw = new URLSearchParams(window.location.search).get("partnerId");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

import { webSignInErrorMessage } from "../../shared/webSignInHelpers";

export function partnerAdminErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const map: Record<string, string> = {
    portal_key_required: "Portal key is required.",
    portal_key_invalid: "Portal key format is invalid (use lowercase letters, numbers, hyphens).",
    portal_key_conflicts_game_type: "Portal key cannot match a registered game type.",
    portal_key_taken: "That portal key is already in use.",
    portal_context_required: 'Enable the "portal" context on the partner profile before saving.',
    not_found: "Partner not found or access denied.",
  };
  return map[raw] ?? webSignInErrorMessage(error);
}

export function partnerAdminSuccessMessage(key: string): string {
  const map: Record<string, string> = {
    partnerCreated: "Partner created.",
    profileSaved: "Profile saved.",
    authChannelsSaved: "Auth channels updated.",
    memberAdded: "Team member added.",
    memberRemoved: "Team member removed.",
    portalSaved: "Portal configuration saved.",
  };
  return map[key] ?? key;
}

export const ENABLED_CONTEXT_OPTIONS = [
  "casual",
  "portal",
  "campaign",
  "tactical",
] as const;

export type EnabledContext = (typeof ENABLED_CONTEXT_OPTIONS)[number];

export const PARTNER_ROLE_OPTIONS = ["owner", "admin", "developer", "viewer"] as const;

