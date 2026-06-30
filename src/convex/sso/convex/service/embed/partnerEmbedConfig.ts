import type { EmbedAuthMethod } from "./embedAuthConstants";
import { EMBED_JWT_AUDIENCE } from "./embedAuthConstants";

type PartnerEmbedJwtConfig = {
  audience?: string;
  algorithm?: "HS256" | "RS256";
};

type PartnerEmbedBlock = {
  method?: EmbedAuthMethod;
  jwt?: PartnerEmbedJwtConfig;
};

export function partnerEmbedBlock(partnerData: unknown): PartnerEmbedBlock | null {
  if (!partnerData || typeof partnerData !== "object") return null;
  const embed = (partnerData as { embed?: unknown }).embed;
  if (!embed || typeof embed !== "object") return null;
  return embed as PartnerEmbedBlock;
}

export function resolveEmbedMethod(partnerData: unknown): EmbedAuthMethod {
  const block = partnerEmbedBlock(partnerData);
  const method = block?.method;
  if (
    method === "jwt_local" ||
    method === "crazygames_jwt" ||
    method === "code_exchange" ||
    method === "session_introspect"
  ) {
    return method;
  }
  return "jwt_local";
}

/** HS256 signing secret for partner-issued embed JWT. */
export function partnerJwtSecret(pid: number, partnerData: unknown): string {
  if (partnerData && typeof partnerData === "object") {
    const top = partnerData as { jwtSecret?: unknown };
    if (typeof top.jwtSecret === "string" && top.jwtSecret.trim()) {
      return top.jwtSecret;
    }
    const block = partnerEmbedBlock(partnerData);
    const nested = block?.jwt as { secret?: string } | undefined;
    if (typeof nested?.secret === "string" && nested.secret.trim()) {
      return nested.secret;
    }
  }
  return `partner-dev-secret-${pid}`;
}

export function embedJwtAudience(partnerData: unknown): string {
  const block = partnerEmbedBlock(partnerData);
  const aud = block?.jwt?.audience;
  return typeof aud === "string" && aud.trim() ? aud.trim() : EMBED_JWT_AUDIENCE;
}
