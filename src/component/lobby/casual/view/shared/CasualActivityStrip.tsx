import React, { useMemo } from "react";

import type { CasualActivityPublicRow } from "../../service/casualActivityTypes";
import {
  formatActivityEffectChips,
  formatActivityRemaining,
  formatTargetScopeShort,
} from "./casualActivityUi";

import "./casualActivityStrip.css";

interface CasualActivityStripProps {
  activities: CasualActivityPublicRow[];
  nowMs?: number;
  /** 默认「限时活动」，商店页可传「商店促销」 */
  sectionTitle?: string;
  /** 列表无障碍名称，默认与 sectionTitle 相同 */
  ariaLabel?: string;
}

const CasualActivityStrip: React.FC<CasualActivityStripProps> = ({
  activities,
  nowMs,
  sectionTitle = "限时活动",
  ariaLabel = sectionTitle,
}) => {
  const now = nowMs ?? Date.now();

  const sorted = useMemo(() => {
    return [...activities].sort((a, b) => a.endsAt - b.endsAt);
  }, [activities]);

  if (sorted.length === 0) return null;

  return (
    <section className="casual-activity-strip" aria-label={ariaLabel ?? sectionTitle}>
      <div className="casual-activity-strip__head">
        <span className="casual-activity-strip__headTitle">{sectionTitle}</span>
        <span className="casual-activity-strip__headHint">{sorted.length} 项进行中</span>
      </div>
      <div className="casual-activity-strip__scroll" role="list">
        {sorted.map((a) => {
          const chips = formatActivityEffectChips(a);
          return (
            <article key={a.activityId} className="casual-activity-strip__card" role="listitem">
              <div className="casual-activity-strip__cardTop">
                <span className="casual-activity-strip__badge">{formatTargetScopeShort(a)}</span>
                <span className="casual-activity-strip__remain">{formatActivityRemaining(a.endsAt, now)}</span>
              </div>
              <h3 className="casual-activity-strip__title">{a.title}</h3>
              {chips.length ? (
                <div className="casual-activity-strip__chips" aria-label="效果摘要">
                  {chips.map((c) => (
                    <span key={c} className="casual-activity-strip__chip">
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="casual-activity-strip__muted">已配置（无摘要字段）</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default CasualActivityStrip;
