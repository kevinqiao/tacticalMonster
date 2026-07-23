import { v } from "convex/values";

import {
  CLERK_AUTH_CHANNEL_CID,
  EMBED_AUTH_CHANNEL_CID,
} from "./authChannelCatalog";
import type { EmbedAuthMethod } from "../embed/embedAuthConstants";
import { EMBED_AUTH_METHODS } from "../embed/embedAuthConstants";

/** Player login SoT. */
export const PLAYER_AUTH_MODES = ["clerk", "embed", "embed_then_clerk"] as const;
export type PlayerAuthMode = (typeof PLAYER_AUTH_MODES)[number];

/** Staff console login SoT. */
export const STAFF_AUTH_MODES = ["web"] as const;
export type StaffAuthMode = (typeof STAFF_AUTH_MODES)[number];

export type PlayerAuthEmbedConfig = {
  method: EmbedAuthMethod;
};

export type PlayerAuth = {
  mode: PlayerAuthMode;
  /** Present when mode uses embed (required for embed / embed_then_clerk). */
  embed?: PlayerAuthEmbedConfig;
};

export type StaffAuth = {
  mode: StaffAuthMode;
};

export const playerAuthValidator = v.object({
  mode: v.union(
    v.literal("clerk"),
    v.literal("embed"),
    v.literal("embed_then_clerk")
  ),
  embed: v.optional(
    v.object({
      method: v.union(
        v.literal("jwt_local"),
        v.literal("crazygames_jwt"),
        v.literal("code_exchange"),
        v.literal("session_introspect")
      ),
    })
  ),
});

export const staffAuthValidator = v.object({
  mode: v.literal("web"),
});

export const DEFAULT_PLAYER_AUTH: PlayerAuth = { mode: "clerk" };
export const DEFAULT_STAFF_AUTH: StaffAuth = { mode: "web" };
export const DEFAULT_EMBED_PLAYER_AUTH: PlayerAuth = {
  mode: "embed",
  embed: { method: "jwt_local" },
};

/** Partner row shape used by auth resolve helpers. */
export type PartnerAuthRow = {
  playerAuth?: PlayerAuth | null;
  staffAuth?: StaffAuth | null;
  /** Runtime config bag (embed JWT secret, branding, allowedOrigins, ...). */
  data?: unknown;
};

function isPlayerAuthMode(raw: unknown): raw is PlayerAuthMode {
  return (
    typeof raw === "string" &&
    (PLAYER_AUTH_MODES as readonly string[]).includes(raw)
  );
}

function isEmbedMethod(raw: unknown): raw is EmbedAuthMethod {
  return (
    typeof raw === "string" &&
    (EMBED_AUTH_METHODS as readonly string[]).includes(raw)
  );
}

function embedMethodFromData(data: unknown): EmbedAuthMethod {
  if (!data || typeof data !== "object") return "jwt_local";
  const embed = (data as { embed?: { method?: unknown } }).embed;
  const method = embed?.method;
  return isEmbedMethod(method) ? method : "jwt_local";
}

/**
 * Map a legacy consumer cid list (bootstrap / admin input only) → playerAuth.mode.
 * Not persisted; callers convert to `playerAuth` before write.
 */
export function playerAuthModeFromConsumerCids(cids: number[]): PlayerAuthMode {
  const set = new Set(
    cids.filter((c) => c === CLERK_AUTH_CHANNEL_CID || c === EMBED_AUTH_CHANNEL_CID)
  );
  const hasClerk = set.has(CLERK_AUTH_CHANNEL_CID);
  const hasEmbed = set.has(EMBED_AUTH_CHANNEL_CID);
  if (hasClerk && hasEmbed) return "embed_then_clerk";
  if (hasEmbed) return "embed";
  return "clerk";
}

export function sanitizePlayerAuth(input: unknown, data?: unknown): PlayerAuth {
  if (!input || typeof input !== "object") {
    throw new Error("player_auth_invalid");
  }
  const modeRaw = (input as { mode?: unknown }).mode;
  if (!isPlayerAuthMode(modeRaw)) {
    throw new Error("player_auth_mode_invalid");
  }
  const embedRaw = (input as { embed?: { method?: unknown } }).embed;
  if (modeRaw === "clerk") {
    return { mode: "clerk" };
  }
  const method =
    embedRaw && isEmbedMethod(embedRaw.method)
      ? embedRaw.method
      : embedMethodFromData(data);
  return { mode: modeRaw, embed: { method } };
}

export function sanitizeStaffAuth(input: unknown): StaffAuth {
  if (!input || typeof input !== "object") {
    throw new Error("staff_auth_invalid");
  }
  const mode = (input as { mode?: unknown }).mode;
  if (mode !== "web") {
    throw new Error("staff_auth_mode_invalid");
  }
  return { mode: "web" };
}

export function resolvePlayerAuth(partner: PartnerAuthRow | null | undefined): PlayerAuth {
  if (!partner) return { ...DEFAULT_PLAYER_AUTH };
  if (partner.playerAuth && isPlayerAuthMode(partner.playerAuth.mode)) {
    try {
      return sanitizePlayerAuth(partner.playerAuth, partner.data);
    } catch {
      return { ...DEFAULT_PLAYER_AUTH };
    }
  }
  return { ...DEFAULT_PLAYER_AUTH };
}

export function resolveStaffAuth(partner: PartnerAuthRow | null | undefined): StaffAuth {
  if (!partner) return { ...DEFAULT_STAFF_AUTH };
  if (partner.staffAuth?.mode === "web") return { mode: "web" };
  return { ...DEFAULT_STAFF_AUTH };
}

export function playerAuthAllowsClerk(auth: PlayerAuth): boolean {
  return auth.mode === "clerk" || auth.mode === "embed_then_clerk";
}

export function playerAuthAllowsEmbed(auth: PlayerAuth): boolean {
  return auth.mode === "embed" || auth.mode === "embed_then_clerk";
}

export function resolvePlayerEmbedMethod(
  auth: PlayerAuth,
  data?: unknown
): EmbedAuthMethod {
  if (auth.embed?.method && isEmbedMethod(auth.embed.method)) {
    return auth.embed.method;
  }
  return embedMethodFromData(data);
}

/** Authenticator cid gate (identity routing still uses catalog cids). */
export function assertPlayerAuthAllowsCid(
  partner: PartnerAuthRow | null | undefined,
  cid: number
): void {
  const auth = resolvePlayerAuth(partner);
  if (cid === CLERK_AUTH_CHANNEL_CID && playerAuthAllowsClerk(auth)) return;
  if (cid === EMBED_AUTH_CHANNEL_CID && playerAuthAllowsEmbed(auth)) return;
  throw new Error("auth_channel_unavailable");
}

export function assertStaffAuthAllowsWeb(
  partner: PartnerAuthRow | null | undefined
): void {
  const auth = resolveStaffAuth(partner);
  if (auth.mode !== "web") {
    throw new Error("staff_auth_channel_unavailable");
  }
}

/** Fields to persist on partner insert/patch. */
export function partnerAuthPersistFields(args: {
  playerAuth: PlayerAuth;
  staffAuth?: StaffAuth;
}): { playerAuth: PlayerAuth; staffAuth: StaffAuth } {
  return {
    playerAuth: sanitizePlayerAuth(args.playerAuth),
    staffAuth: sanitizeStaffAuth(args.staffAuth ?? DEFAULT_STAFF_AUTH),
  };
}
