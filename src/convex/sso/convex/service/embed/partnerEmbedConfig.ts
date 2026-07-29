import type { EmbedAuthMethod } from "./embedAuthConstants";
import { EMBED_JWT_AUDIENCE } from "./embedAuthConstants";

type PartnerEmbedJwtConfig = {
  audience?: string;
  algorithm?: "HS256" | "RS256";
  secret?: string;
};

export type PartnerEmbedConfig = {
  jwtSecret?: string;
  jwt?: PartnerEmbedJwtConfig;
  allowedOrigins?: string[];
  /** @deprecated prefer playerAuth.embed.method */
  method?: EmbedAuthMethod;
};

type PartnerEmbedBlock = {
  method?: EmbedAuthMethod;
  jwt?: PartnerEmbedJwtConfig;
};

type PartnerLike = {
  embed?: PartnerEmbedConfig | null;
  data?: unknown;
};

function dataBag(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};
  return data as Record<string, unknown>;
}

/** Prefer first-class `partner.embed`, fall back to legacy `partner.data`. */
export function resolvePartnerEmbed(partner: PartnerLike | unknown): PartnerEmbedConfig {
  if (!partner || typeof partner !== "object") return {};
  const row = partner as PartnerLike;
  const data = dataBag(row.data);
  const first = row.embed ?? {};
  const legacyEmbed =
    data.embed && typeof data.embed === "object"
      ? (data.embed as PartnerEmbedBlock)
      : null;

  const jwtSecret =
    (typeof first.jwtSecret === "string" && first.jwtSecret.trim()
      ? first.jwtSecret.trim()
      : undefined) ||
    (typeof data.jwtSecret === "string" && data.jwtSecret.trim()
      ? data.jwtSecret.trim()
      : undefined) ||
    (typeof first.jwt?.secret === "string" && first.jwt.secret.trim()
      ? first.jwt.secret.trim()
      : undefined) ||
    (typeof legacyEmbed?.jwt?.secret === "string" && legacyEmbed.jwt.secret.trim()
      ? legacyEmbed.jwt.secret.trim()
      : undefined);

  const audience =
    (typeof first.jwt?.audience === "string" && first.jwt.audience.trim()
      ? first.jwt.audience.trim()
      : undefined) ||
    (typeof legacyEmbed?.jwt?.audience === "string" && legacyEmbed.jwt.audience.trim()
      ? legacyEmbed.jwt.audience.trim()
      : undefined);

  const allowedOrigins =
    first.allowedOrigins ??
    (Array.isArray(data.allowedOrigins)
      ? (data.allowedOrigins as unknown[]).filter((s): s is string => typeof s === "string")
      : undefined);

  const method = first.method ?? legacyEmbed?.method;

  return {
    jwtSecret,
    jwt: audience || first.jwt?.secret || legacyEmbed?.jwt?.secret
      ? {
          audience,
          secret: first.jwt?.secret ?? legacyEmbed?.jwt?.secret,
          algorithm: first.jwt?.algorithm ?? legacyEmbed?.jwt?.algorithm,
        }
      : undefined,
    allowedOrigins,
    method,
  };
}

/** @deprecated use resolvePartnerEmbed(partner) — accepts data bag or full partner. */
export function partnerEmbedBlock(partnerData: unknown): PartnerEmbedBlock | null {
  const resolved = resolvePartnerEmbed(
    partnerData && typeof partnerData === "object" && "data" in (partnerData as object)
      ? partnerData
      : { data: partnerData }
  );
  if (!resolved.method && !resolved.jwt) return null;
  return {
    method: resolved.method,
    jwt: resolved.jwt,
  };
}

export function resolveEmbedMethod(partnerOrData: unknown): EmbedAuthMethod {
  const resolved = resolvePartnerEmbed(
    partnerOrData && typeof partnerOrData === "object" && "embed" in (partnerOrData as object)
      ? partnerOrData
      : { data: partnerOrData }
  );
  const method = resolved.method;
  if (
    method === "jwt_local" ||
    method === "crazygames_jwt" ||
    method === "code_exchange" ||
    method === "session_introspect"
  ) {
    return method;
  }
  // Legacy: data.embed.method via bag-only argument
  const block = partnerEmbedBlock(partnerOrData);
  const legacy = block?.method;
  if (
    legacy === "jwt_local" ||
    legacy === "crazygames_jwt" ||
    legacy === "code_exchange" ||
    legacy === "session_introspect"
  ) {
    return legacy;
  }
  return "jwt_local";
}

/** HS256 signing secret for partner-issued embed JWT. */
export function partnerJwtSecret(pid: number, partnerOrData: unknown): string {
  const resolved = resolvePartnerEmbed(
    partnerOrData && typeof partnerOrData === "object" && ("embed" in (partnerOrData as object) || "data" in (partnerOrData as object))
      ? partnerOrData
      : { data: partnerOrData }
  );
  if (resolved.jwtSecret?.trim()) return resolved.jwtSecret.trim();
  if (resolved.jwt?.secret?.trim()) return resolved.jwt.secret.trim();
  return `partner-dev-secret-${pid}`;
}

export function embedJwtAudience(partnerOrData: unknown): string {
  const resolved = resolvePartnerEmbed(
    partnerOrData && typeof partnerOrData === "object" && ("embed" in (partnerOrData as object) || "data" in (partnerOrData as object))
      ? partnerOrData
      : { data: partnerOrData }
  );
  const aud = resolved.jwt?.audience;
  return typeof aud === "string" && aud.trim() ? aud.trim() : EMBED_JWT_AUDIENCE;
}
