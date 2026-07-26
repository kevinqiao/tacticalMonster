import { parseErrorCode } from "../../campaign/shared/campaignErrorMessage";
import { webSignInErrorMessage } from "../../shared/webSignInHelpers";

export function partnerIdFromLocation(): number | null {
  const raw = new URLSearchParams(window.location.search).get("partnerId");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const PARTNER_ADMIN_ERROR_MAP: Record<string, string> = {
  slug_required: "Partner slug is required.",
  slug_invalid: "Partner slug format is invalid (use lowercase letters, numbers, hyphens).",
  slug_reserved: "That partner slug is reserved.",
  slug_conflicts_game_type: "Partner slug cannot match a registered game type.",
  slug_taken: "That partner slug is already in use.",
  /** @deprecated aliases — same messages as slug_* */
  portal_key_required: "Partner slug is required.",
  portal_key_invalid: "Partner slug format is invalid (use lowercase letters, numbers, hyphens).",
  portal_key_conflicts_game_type: "Partner slug cannot match a registered game type.",
  portal_key_taken: "That partner slug is already in use.",
  portal_context_required:
    "Portal Games capability must be enabled in /platform/admin before saving portal config.",
  portal_games_required: "Select at least one portal game.",
  portal_game_invalid: "One or more selected games are not in the registry.",
  forbidden: "You need admin (or owner) role on this Partner to save.",
  unauthenticated: "Please sign in again, then retry.",
  not_found: "Partner not found or access denied.",
};

export function partnerAdminErrorMessage(error: unknown): string {
  const code = parseErrorCode(error);
  return PARTNER_ADMIN_ERROR_MAP[code] ?? webSignInErrorMessage(error);
}

export function partnerAdminSuccessMessage(key: string): string {
  const map: Record<string, string> = {
    partnerCreated: "Partner created.",
    profileSaved: "Profile saved.",
    authChannelsSaved: "登录配置已保存。",
    memberAdded: "Team member added.",
    memberUpdated: "Team member updated.",
    memberRemoved: "Team member removed.",
    portalSaved: "Portal configuration saved.",
  };
  return map[key] ?? key;
}

export const PARTNER_ROLE_OPTIONS = ["owner", "admin", "developer", "viewer"] as const;

