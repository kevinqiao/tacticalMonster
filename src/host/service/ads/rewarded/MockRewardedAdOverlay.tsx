import React, { useEffect, useState } from "react";

import { isDevMockRewardedAdEnabled } from "./devMockRewardedAdConfig";
import "./mockRewardedAdOverlay.css";
import {
  finishMockRewardedAdPlayback,
  getActiveMockRewardedAdPlayback,
  subscribeMockRewardedAdPlayback,
} from "./mockRewardedAdPlayback";

export function MockRewardedAdOverlay(): React.ReactElement | null {
  const [playback, setPlayback] = useState(getActiveMockRewardedAdPlayback);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isDevMockRewardedAdEnabled()) return;
    return subscribeMockRewardedAdPlayback(() => {
      setPlayback(getActiveMockRewardedAdPlayback());
      setElapsedMs(0);
    });
  }, []);

  useEffect(() => {
    if (!playback) return;

    const startedAt = performance.now();
    const tick = window.setInterval(() => {
      const nextElapsed = performance.now() - startedAt;
      setElapsedMs(nextElapsed);
      if (nextElapsed >= playback.durationMs) {
        window.clearInterval(tick);
        finishMockRewardedAdPlayback(true);
      }
    }, 50);

    return () => window.clearInterval(tick);
  }, [playback]);

  if (!isDevMockRewardedAdEnabled() || !playback) {
    return null;
  }

  const remainingMs = Math.max(0, playback.durationMs - elapsedMs);
  const progress = Math.min(1, elapsedMs / playback.durationMs);
  const remainingSec = Math.ceil(remainingMs / 1000);

  return (
    <div className="mock-ad-overlay" role="dialog" aria-modal="true" aria-label="模拟广告播放">
      <div className="mock-ad-card">
        <div className="mock-ad-badge">DEV MOCK AD</div>
        <h2 className="mock-ad-title">模拟广告播放中</h2>
        <p className="mock-ad-subtitle">播放结束后将自动重新开始本局</p>
        <div className="mock-ad-progress-track" aria-hidden="true">
          <div className="mock-ad-progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="mock-ad-countdown">
          {remainingSec > 0 ? `约 ${remainingSec} 秒后完成` : "正在完成…"}
        </p>
        <div className="mock-ad-actions">
          <button
            type="button"
            className="mock-ad-btn mock-ad-btn--primary"
            onClick={() => finishMockRewardedAdPlayback(true)}
          >
            立即完成
          </button>
          <button
            type="button"
            className="mock-ad-btn mock-ad-btn--ghost"
            onClick={() => finishMockRewardedAdPlayback(false)}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
