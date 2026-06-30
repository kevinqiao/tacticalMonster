import { crazyGamesSdkSource } from "./crazyGamesSdkSource";
import { partnerPostMessageSource } from "./partnerPostMessageSource";
import type { EmbedCredentialSource } from "./types";

const SOURCES: EmbedCredentialSource[] = [crazyGamesSdkSource, partnerPostMessageSource];

export function listEmbedCredentialSources(): EmbedCredentialSource[] {
  return [...SOURCES].sort((a, b) => a.priority - b.priority);
}

export function anyEmbedCredentialSourceActive(
  ctx: Parameters<EmbedCredentialSource["isActive"]>[0]
): boolean {
  return listEmbedCredentialSources().some((source) => source.isActive(ctx));
}

export function anyEmbedCredentialSourceEligible(
  ctx: Parameters<EmbedCredentialSource["isActive"]>[0]
): boolean {
  return listEmbedCredentialSources().some(
    (source) => source.isActive(ctx) || source.shouldPreload?.(ctx) === true
  );
}
