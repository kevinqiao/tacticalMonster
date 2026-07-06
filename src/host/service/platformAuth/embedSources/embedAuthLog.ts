const PREFIX = "[EmbedAuth]";

export type EmbedSdkLoadOutcome = "already_present" | "script_injected" | "ready";

export function logEmbedSdkLoad(
  sdkId: string,
  outcome: EmbedSdkLoadOutcome,
  scriptUrl?: string
): void {
  console.info(PREFIX, "sdk load", { sdkId, outcome, ...(scriptUrl ? { scriptUrl } : {}) });
}

export function logEmbedSdkLoadFailed(sdkId: string, error: unknown): void {
  console.warn(PREFIX, "sdk load failed", { sdkId, error });
}

export function logEmbedSdkLoadCached(sdkId: string): void {
  console.info(PREFIX, "sdk load (cached)", { sdkId });
}

export type EmbedSdkLoadCandidate = {
  sourceId: string;
  sdkId: string;
  shouldPreload: boolean;
  isActive: boolean;
  selected: boolean;
};

/** Log which SDK scripts will load (or why none). Always call before loadEmbedSdk. */
export function logEmbedSdkLoadDecision(
  specs: { id: string; scriptUrl: string }[],
  ctx: { partnerPid: number; portalPartnerKey?: string | null },
  candidates: EmbedSdkLoadCandidate[]
): void {
  if (specs.length === 0) {
    console.info(PREFIX, "sdk load skipped — no eligible sdk", {
      partnerPid: ctx.partnerPid,
      portalPartnerKey: ctx.portalPartnerKey ?? null,
      candidates,
    });
    return;
  }
  console.info(PREFIX, "sdk load planned", {
    partnerPid: ctx.partnerPid,
    portalPartnerKey: ctx.portalPartnerKey ?? null,
    sdkIds: specs.map((s) => s.id),
    scriptUrls: specs.map((s) => s.scriptUrl),
    candidates,
  });
}

export function logEmbedSourceStart(sourceId: string, method: string, pid: number): void {
  console.info(PREFIX, "source start", { sourceId, method, pid });
}

export function logEmbedSourcesListening(
  sourceIds: string[],
  partnerPid: number
): void {
  if (sourceIds.length === 0) {
    console.info(PREFIX, "no embed sources listening", { partnerPid });
    return;
  }
  console.info(PREFIX, "sources listening", { sourceIds, partnerPid });
}

export function logEmbedCredentialReceived(
  sourceId: string,
  method: string,
  pid: number,
  tokenChars: number
): void {
  console.info(PREFIX, "embed credential received", { sourceId, method, pid, tokenChars });
}

export function logEmbedCredentialMissing(
  sourceId: string,
  method: string,
  pid: number,
  reason: string
): void {
  console.warn(PREFIX, "embed credential missing", { sourceId, method, pid, reason });
}

export function logEmbedPlatformExchange(
  method: string,
  pid: number,
  outcome: "success" | "failed" | "skipped_duplicate",
  opts?: { uid?: string; reason?: string; tokenChars?: number }
): void {
  const payload = { method, pid, ...opts };
  if (outcome === "success") {
    console.info(PREFIX, "platform exchange success", payload);
  } else if (outcome === "skipped_duplicate") {
    console.info(PREFIX, "platform exchange skipped (in flight)", payload);
  } else {
    console.warn(PREFIX, "platform exchange failed", { ...payload, outcome });
  }
}
