/** Dev diagnostics: step timing for `/internal/casual-run-ingest` and nested handlers. */
export type IngestTiming = {
  mark: (step: string, extra?: Record<string, unknown>) => void;
  finish: (step: string, extra?: Record<string, unknown>) => void;
};

export function createIngestTiming(scope: string, key: string): IngestTiming {
  const t0 = Date.now();
  let last = t0;
  const prefix = `[portal][ingest-timing][${scope}]`;

  const log = (step: string, extra?: Record<string, unknown>, done?: boolean) => {
    const now = Date.now();
    console.log(prefix, key, step, {
      stepMs: now - last,
      totalMs: now - t0,
      ...(done ? { done: true } : {}),
      ...extra,
    });
    last = now;
  };

  return {
    mark: (step, extra) => log(step, extra),
    finish: (step, extra) => log(step, extra, true),
  };
}
