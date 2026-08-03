import { useEffect, useState } from 'react';

function formatRemainingMs(ms: number): string {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** 再战窗口剩余时间 `m:ss`；过期或未设置返回 `null`。 */
export function useReplayWindowCountdown(replayWindowEndsAt: number | undefined): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (replayWindowEndsAt == null || !Number.isFinite(replayWindowEndsAt)) {
      setLabel(null);
      return;
    }
    const tick = () => {
      const remaining = replayWindowEndsAt - Date.now();
      if (remaining <= 0) {
        setLabel(null);
        return;
      }
      setLabel(formatRemainingMs(remaining));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [replayWindowEndsAt]);

  return label;
}
