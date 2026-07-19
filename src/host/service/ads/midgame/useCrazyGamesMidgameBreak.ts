import { useEffect, useState } from "react";

import { showMidgameAdAtBreak } from "./midgameAdOrchestrator";

/**
 * When `active` becomes true, request a midgame break ad and return `ready`
 * only after the SDK settles (finished / unfilled / unsupported).
 * Callers should block interactive UI until `ready`.
 */
export function useCrazyGamesMidgameBreak(active: boolean): boolean {
  const [ready, setReady] = useState(!active);

  useEffect(() => {
    if (!active) {
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    void showMidgameAdAtBreak().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [active]);

  return ready;
}
