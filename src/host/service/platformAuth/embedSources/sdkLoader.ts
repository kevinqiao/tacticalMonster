import {
  logEmbedSdkLoad,
  logEmbedSdkLoadCached,
  logEmbedSdkLoadDecision,
  logEmbedSdkLoadFailed,
  type EmbedSdkLoadCandidate,
} from "./embedAuthLog";
import type { EmbedCredentialSource } from "./types";

export type EmbedSdkSpec = {
  id: string;
  scriptUrl: string;
  globalProbe: () => boolean;
  /** After script is present (e.g. CrazyGames SDK.init). */
  afterLoad?: () => Promise<void>;
};

const DEFAULT_PROBE_INTERVAL_MS = 50;
const DEFAULT_PROBE_TIMEOUT_MS = 8000;
const loadCache = new Map<string, Promise<void>>();

export async function waitUntilEmbedSdkProbe(
  probe: () => boolean,
  opts?: { intervalMs?: number; timeoutMs?: number }
): Promise<void> {
  if (probe()) return;
  const intervalMs = opts?.intervalMs ?? DEFAULT_PROBE_INTERVAL_MS;
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;
  const started = Date.now();
  await new Promise<void>((resolve, reject) => {
    const tick = () => {
      if (probe()) { resolve(); return; }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error("embed sdk probe timeout"));
        return;
      }
      window.setTimeout(tick, intervalMs);
    };
    tick();
  });
}

export function loadEmbedSdk(spec: EmbedSdkSpec): Promise<void> {
  const cached = loadCache.get(spec.id);
  if (cached) {
    logEmbedSdkLoadCached(spec.id);
    return cached;
  }
  console.info("[EmbedAuth]", "sdk load start", { sdkId: spec.id, scriptUrl: spec.scriptUrl });
  const promise = (async () => {
    try {
      const finishReady = async () => {
        if (spec.afterLoad) {
          // afterLoad (SDK.init) must not hang the whole embed pipeline
          await Promise.race([
            spec.afterLoad(),
            new Promise<void>((resolve) => {
              window.setTimeout(() => {
                console.warn("[EmbedAuth]", "sdk afterLoad timed out; continuing", {
                  sdkId: spec.id,
                });
                resolve();
              }, 15_000);
            }),
          ]);
        }
        logEmbedSdkLoad(spec.id, "ready", spec.scriptUrl);
      };
      if (spec.globalProbe()) {
        logEmbedSdkLoad(spec.id, "already_present", spec.scriptUrl);
        await finishReady();
        return;
      }
      if (typeof document === "undefined") {
        throw new Error(`embed sdk unavailable without document: ${spec.id}`);
      }
      const existing = document.querySelector(`script[data-embed-sdk="${spec.id}"]`);
      if (existing && spec.globalProbe()) {
        logEmbedSdkLoad(spec.id, "already_present", spec.scriptUrl);
        await finishReady();
        return;
      }
      // Prefer an already-injected CG script (no data-embed-sdk attr) over a second copy.
      const anyCgScript = document.querySelector(
        'script[src*="crazygames-sdk"], script[data-embed-sdk="crazygames_v3"]'
      );
      if (!existing && !anyCgScript) {
        await injectEmbedSdkScript(spec);
        logEmbedSdkLoad(spec.id, "script_injected", spec.scriptUrl);
      } else if (!spec.globalProbe()) {
        logEmbedSdkLoad(spec.id, "script_injected", spec.scriptUrl);
      }
      await waitUntilEmbedSdkProbe(spec.globalProbe);
      await finishReady();
    } catch (error) {
      logEmbedSdkLoadFailed(spec.id, error);
      throw error;
    }
  })();
  loadCache.set(spec.id, promise);
  return promise;
}

function injectEmbedSdkScript(spec: EmbedSdkSpec): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = spec.scriptUrl;
    el.async = true;
    el.dataset.embedSdk = spec.id;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`embed sdk script failed: ${spec.id}`));
    document.head.appendChild(el);
  });
}

export function collectEmbedSdkSpecs(
  sources: EmbedCredentialSource[],
  ctx: Parameters<EmbedCredentialSource["isActive"]>[0]
): EmbedSdkSpec[] {
  const seen = new Set<string>();
  const specs: EmbedSdkSpec[] = [];
  for (const source of sources) {
    const spec = source.sdkSpec;
    if (!spec) continue;
    if (!source.isActive(ctx) && !source.shouldPreload?.(ctx)) continue;
    if (seen.has(spec.id)) continue;
    seen.add(spec.id);
    specs.push(spec);
  }
  return specs;
}

function buildEmbedSdkLoadCandidates(
  sources: EmbedCredentialSource[],
  ctx: Parameters<EmbedCredentialSource["isActive"]>[0]
): EmbedSdkLoadCandidate[] {
  return sources
    .filter((source) => source.sdkSpec)
    .map((source) => {
      const shouldPreload = source.shouldPreload?.(ctx) ?? false;
      const isActive = source.isActive(ctx);
      return {
        sourceId: source.id,
        sdkId: source.sdkSpec!.id,
        shouldPreload,
        isActive,
        selected: isActive || shouldPreload,
      };
    });
}

/** Collect specs, log decision, then load each script. */
export function planEmbedSdkLoads(
  sources: EmbedCredentialSource[],
  ctx: Parameters<EmbedCredentialSource["isActive"]>[0]
): EmbedSdkSpec[] {
  const specs = collectEmbedSdkSpecs(sources, ctx);
  logEmbedSdkLoadDecision(specs, ctx, buildEmbedSdkLoadCandidates(sources, ctx));
  return specs;
}

export async function loadEmbedSdkSpecs(specs: EmbedSdkSpec[]): Promise<void> {
  if (specs.length === 0) return;
  await Promise.all(specs.map((spec) => loadEmbedSdk(spec)));
}

export async function loadSdksForSources(
  sources: EmbedCredentialSource[],
  ctx: Parameters<EmbedCredentialSource["isActive"]>[0]
): Promise<void> {
  const specs = planEmbedSdkLoads(sources, ctx);
  await loadEmbedSdkSpecs(specs);
}

export function resetEmbedSdkLoadCacheForTests(): void {
  loadCache.clear();
}
