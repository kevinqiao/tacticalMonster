import React, { useMemo } from "react";

import type { CasualPlatformValue } from "../../service/useCasualPlatformManager";

type GrowthBucket = NonNullable<CasualPlatformValue["dailyGrowthProgress"]>["buckets"][number];

const BUCKET_META: Record<
  GrowthBucket["bucket"],
  { title: string; hint: string }
> = {
  async: {
    title: "异步 A/B/C",
    hint: "A/B/C 与三合一共用计数",
  },
  season_challenge: {
    title: "赛季专场",
    hint: "券入场 · Pass/League 满额",
  },
  solo_p75: {
    title: "p75 挑战",
    hint: "金币日软顶 · League 仅达标",
  },
};

function formatDecay(mult: number): string {
  if (mult >= 1) return "100%";
  return `${Math.round(mult * 100)}%`;
}

function fullXpLabel(row: GrowthBucket): string {
  if (!row.xpOrdinalDecayEnabled) return "满额 Pass/League";
  const used = Math.min(row.settledCount, row.fullXpSlotsTotal);
  if (used >= row.fullXpSlotsTotal) {
    return `满额场已用完 · 下一场 ${formatDecay(row.nextXpDecayMultiplier)}`;
  }
  return `满额场 ${used}/${row.fullXpSlotsTotal} · 下一场 ${formatDecay(row.nextXpDecayMultiplier)}`;
}

const CasualDailyGrowthPanel: React.FC<{
  progress: CasualPlatformValue["dailyGrowthProgress"];
}> = ({ progress }) => {
  const buckets = progress?.buckets;
  const ordered = useMemo(() => {
    if (!buckets?.length) return [];
    const order: GrowthBucket["bucket"][] = ["async", "season_challenge", "solo_p75"];
    return order
      .map((key) => buckets.find((b) => b.bucket === key))
      .filter((b): b is GrowthBucket => Boolean(b));
  }, [buckets]);

  if (!ordered.length) return null;

  return (
    <section className="casual-play-hub__growth" aria-label="今日成长">
      <div className="casual-play-hub__growthHead">
        <h3 className="casual-play-hub__growthTitle">今日成长</h3>
        <span className="casual-play-hub__growthSub">Pass / League XP · 分桶计数</span>
      </div>
      <ul className="casual-play-hub__growthList">
        {ordered.map((row) => {
          const meta = BUCKET_META[row.bucket];
          const coinPct =
            row.coinsDailyCap && row.coinsDailyCap > 0
              ? Math.min(100, Math.round(((row.coinsGrantedToday ?? 0) / row.coinsDailyCap) * 100))
              : 0;
          return (
            <li key={row.bucket} className="casual-play-hub__growthRow">
              <div className="casual-play-hub__growthRowTop">
                <span className="casual-play-hub__growthRowTitle">{meta.title}</span>
                <span className="casual-play-hub__growthRowCount">今日 {row.settledCount} 场</span>
              </div>
              {row.xpOrdinalDecayEnabled ? (
                <div className="casual-play-hub__growthSlots" aria-hidden>
                  {Array.from({ length: row.fullXpSlotsTotal }, (_, i) => (
                    <span
                      key={i}
                      className={
                        i < Math.min(row.settledCount, row.fullXpSlotsTotal)
                          ? "casual-play-hub__growthSlot casual-play-hub__growthSlot--on"
                          : "casual-play-hub__growthSlot"
                      }
                    />
                  ))}
                </div>
              ) : null}
              {typeof row.coinsDailyCap === "number" ? (
                <div className="casual-play-hub__growthCoinBar" aria-label="p75 金币进度">
                  <div
                    className="casual-play-hub__growthCoinFill"
                    style={{ width: `${coinPct}%` }}
                  />
                </div>
              ) : null}
              <p className="casual-play-hub__growthDetail">{fullXpLabel(row)}</p>
              {typeof row.coinsDailyCap === "number" ? (
                <p className="casual-play-hub__growthMeta">
                  金币 {row.coinsGrantedToday ?? 0}/{row.coinsDailyCap}
                </p>
              ) : (
                <p className="casual-play-hub__growthMeta">{meta.hint}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default CasualDailyGrowthPanel;
