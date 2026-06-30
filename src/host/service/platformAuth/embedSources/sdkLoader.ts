import type { EmbedCredentialSource } from "./types";

export type EmbedSdkSpec = {
  id: string;
  scriptUrl: string;
  globalProbe: () => boolean;
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
  if (cached) return cached;
  const promise = (async () => {
    if (spec.globalProbe()) return;
    if (typeof document === "undefined") {
      throw new Error(`embed sdk unavailable without document: ${spec.id}`);
    }
    const existing = document.querySelector(`script[data-embed-sdk="${spec.id}"]`);
    if (existing && spec.globalProbe()) return;
    if (!existing) await injectEmbedSdkScript(spec);
    await waitUntilEmbedSdkProbe(spec.globalProbe);
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

export async function loadSdksForSources(
  sources: EmbedCredentialSource[],
  ctx: Parameters<EmbedCredentialSource["isActive"]>[0]
): Promise<void> {
  const specs = collectEmbedSdkSpecs(sources, ctx);
  if (specs.length === 0) return;
  await Promise.all(specs.map((spec) => loadEmbedSdk(spec)));
}

export function resetEmbedSdkLoadCacheForTests(): void {
  loadCache.clear();
}
