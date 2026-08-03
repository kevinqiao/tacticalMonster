import { crazyGamesSdkSource } from "./crazyGamesSdkSource";
import { partnerPostMessageSource } from "./partnerPostMessageSource";
import type { EmbedCredentialSource, EmbedSourceContext } from "./types";

/**
 * Embed credential source catalog.
 * Add new host-SDK partners here with `claimsHost` + unique `method`;
 * do not hardcode brand checks into partnerPostMessageSource.
 */
const SOURCES: EmbedCredentialSource[] = [crazyGamesSdkSource, partnerPostMessageSource];

export function listEmbedCredentialSources(): EmbedCredentialSource[] {
  return [...SOURCES].sort((a, b) => a.priority - b.priority);
}

export function anyEmbedCredentialSourceActive(ctx: EmbedSourceContext): boolean {
  return listEmbedCredentialSources().some((source) => source.isActive(ctx));
}

export function anyEmbedCredentialSourceEligible(ctx: EmbedSourceContext): boolean {
  return listEmbedCredentialSources().some(
    (source) => source.isActive(ctx) || source.shouldPreload?.(ctx) === true
  );
}

export function listHostClaimingSources(ctx: EmbedSourceContext): EmbedCredentialSource[] {
  return listEmbedCredentialSources().filter((source) => source.claimsHost?.(ctx) === true);
}

/**
 * Sources Bridge should `start`.
 * If any source `claimsHost`, only those claimers (that also `shouldListen`) run —
 * so postMessage yields without knowing CrazyGames/Foo SDK globals.
 */
export function selectEmbedSourcesToListen(ctx: EmbedSourceContext): EmbedCredentialSource[] {
  const sources = listEmbedCredentialSources();
  const claiming = sources.filter((source) => source.claimsHost?.(ctx) === true);
  const pool = claiming.length > 0 ? claiming : sources;
  return pool.filter((source) => source.shouldListen(ctx));
}
