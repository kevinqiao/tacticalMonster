"use node";

import type { EmbedAuthMethod } from "./embedAuthConstants";
import type { EmbedAuthProvider, PartnerEmbedContext } from "./embedAuthTypes";
import { resolveEmbedMethod } from "./partnerEmbedConfig";
import { jwtLocalEmbedAuthProvider } from "./providers/JwtLocalEmbedAuthProvider";
import { crazyGamesEmbedAuthProvider } from "./providers/CrazyGamesEmbedAuthProvider";

const PROVIDERS: Record<EmbedAuthMethod, EmbedAuthProvider | undefined> = {
  jwt_local: jwtLocalEmbedAuthProvider,
  crazygames_jwt: crazyGamesEmbedAuthProvider,
  code_exchange: undefined,
  session_introspect: undefined,
};

export function getEmbedAuthProvider(method: EmbedAuthMethod): EmbedAuthProvider | null {
  return PROVIDERS[method] ?? null;
}

export function resolveEmbedAuthProvider(
  partner: PartnerEmbedContext,
  methodOverride?: EmbedAuthMethod
): EmbedAuthProvider | null {
  const method = methodOverride ?? resolveEmbedMethod(partner);
  const provider = getEmbedAuthProvider(method);
  if (!provider) return null;
  if (!provider.supports(partner)) return null;
  return provider;
}
