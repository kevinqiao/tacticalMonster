import React, { useEffect, useRef, useState } from "react";

import {
  PORTAL_3D_TIER_BADGES,
  type PortalTierId,
} from "./portalGame3DTheme";
import type { Portal3DRulesAnchor } from "./PortalGame3DInner";

type RulesSection = "points" | "tiers" | "rewards";

const TIER_LIST: { id: PortalTierId; label: string }[] = [
  { id: "bronze", label: "青铜" },
  { id: "silver", label: "白银" },
  { id: "gold", label: "黄金" },
  { id: "platinum", label: "铂金" },
  { id: "diamond", label: "钻石" },
];

/** 名次 × 段位 金币奖励矩阵（占位值，以当期活动配置为准） */
const REWARD_MATRIX: {
  range: string;
  zone: "promote" | "keep" | "demote";
  coins: Record<PortalTierId, number | null>;
}[] = [
  {
    range: "第 1 名",
    zone: "promote",
    coins: { bronze: 200, silver: 300, gold: 500, platinum: 800, diamond: 1200 },
  },
  {
    range: "第 2–3 名",
    zone: "promote",
    coins: { bronze: 120, silver: 180, gold: 300, platinum: 480, diamond: 720 },
  },
  {
    range: "第 4–10 名",
    zone: "promote",
    coins: { bronze: 60, silver: 90, gold: 150, platinum: 240, diamond: 360 },
  },
  {
    range: "第 11–40 名",
    zone: "keep",
    coins: { bronze: 20, silver: 30, gold: 50, platinum: 80, diamond: 120 },
  },
  {
    range: "第 41–50 名",
    zone: "demote",
    coins: { bronze: null, silver: null, gold: null, platinum: null, diamond: null },
  },
];

const ZONE_MARKS = {
  promote: { mark: "↑", className: "portal-rules-zone-mark--promote" },
  keep: { mark: "–", className: "portal-rules-zone-mark--keep" },
  demote: { mark: "↓", className: "portal-rules-zone-mark--demote" },
} as const;

function sectionOfAnchor(anchor: Portal3DRulesAnchor | undefined): RulesSection {
  if (anchor === "tiers") return "tiers";
  if (anchor === "rewards") return "rewards";
  return "points";
}

/** 玩法规则弹窗内容：积分 / 段位与分组 / 奖励 三段式（light DOM，卡通主题） */
export function PortalRulesContent({
  anchor,
  currentTierId,
}: {
  anchor?: Portal3DRulesAnchor;
  /** 玩家当前段位；奖励表中高亮对应列 */
  currentTierId?: PortalTierId;
}) {
  const [activeTab, setActiveTab] = useState<RulesSection>(sectionOfAnchor(anchor));
  const sectionRefs = {
    points: useRef<HTMLDivElement>(null),
    tiers: useRef<HTMLDivElement>(null),
    rewards: useRef<HTMLDivElement>(null),
  };
  const soloRef = useRef<HTMLDivElement>(null);
  const multiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!anchor) return;
    const target =
      anchor === "solo"
        ? soloRef.current
        : anchor === "multi"
          ? multiRef.current
          : sectionRefs[sectionOfAnchor(anchor)].current;
    // 等弹窗打开动画布局稳定后再定位
    const t = window.setTimeout(() => {
      target?.scrollIntoView({ block: "start" });
    }, 60);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  const goTo = (section: RulesSection) => {
    setActiveTab(section);
    sectionRefs[section].current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="portal-rules">
      <div className="portal-rules-tabs">
        {(
          [
            ["points", "积分"],
            ["tiers", "段位与分组"],
            ["rewards", "奖励"],
          ] as [RulesSection, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`portal-rules-tab${activeTab === id ? " portal-rules-tab--active" : ""}`}
            onClick={() => goTo(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ---------- 积分 ---------- */}
      <div ref={sectionRefs.points} className="portal-rules-section">
        <h3 className="portal-rules-title">积分</h3>
        <p className="portal-rules-intro">
          两种模式的成绩计入<strong>同一个周榜总分</strong>，总分决定你在本周分组中的名次。
        </p>
        <div ref={soloRef} className="portal-rules-card">
          <div className="portal-rules-card-head">
            <span className="portal-rules-card-title">🎯 单人挑战 CHALLENGE</span>
          </div>
          <ul>
            <li>每局提供一个 seed P75 <strong>目标分</strong>；</li>
            <li>达标 <strong className="portal-rules-pos">+3 分</strong>，未达标 <strong className="portal-rules-neg">-1 分</strong>；</li>
            <li>对局超时未完成，按未达标结算。</li>
          </ul>
        </div>
        <div ref={multiRef} className="portal-rules-card">
          <div className="portal-rules-card-head">
            <span className="portal-rules-card-title">⚔️ 多人竞技 ARENA</span>
          </div>
          <ul>
            <li>与 5 名选手<strong>同种子同桌</strong>对抗，公平比拼；</li>
            <li>
              按名次积分：🥇 <strong className="portal-rules-pos">+5</strong> ／ 🥈{" "}
              <strong className="portal-rules-pos">+3</strong> ／ 🥉{" "}
              <strong className="portal-rules-pos">+1</strong> ／ 第四{" "}
              <strong className="portal-rules-neg">-1</strong> ／ 第五{" "}
              <strong className="portal-rules-neg">-2</strong>。
            </li>
          </ul>
        </div>
      </div>

      {/* ---------- 段位与分组 ---------- */}
      <div ref={sectionRefs.tiers} className="portal-rules-section">
        <h3 className="portal-rules-title">段位与分组</h3>
        <div className="portal-rules-badges">
          {TIER_LIST.map((t, i) => (
            <div key={t.id} className="portal-rules-badge-item">
              <img src={PORTAL_3D_TIER_BADGES[t.id]} alt={t.label} />
              <span>{t.label}</span>
              {i < TIER_LIST.length - 1 ? (
                <span className="portal-rules-badge-arrow">›</span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="portal-rules-card">
          <ul>
            <li>每周与<strong>同段位</strong>玩家分入一个 <strong>50 人小组</strong>，只和组内选手比名次；</li>
            <li>每周结算时按组内名次晋降级：</li>
          </ul>
          <div className="portal-rules-zonebar">
            <div className="portal-rules-zone portal-rules-zone--promote">↑ 升级区 1-10</div>
            <div className="portal-rules-zone portal-rules-zone--keep">保级区 11-40</div>
            <div className="portal-rules-zone portal-rules-zone--demote">↓ 降级区 41-50</div>
          </div>
          <ul>
            <li>新的一周积分清零，按新段位重新分组，重新出发。</li>
          </ul>
        </div>
      </div>

      {/* ---------- 奖励 ---------- */}
      <div ref={sectionRefs.rewards} className="portal-rules-section">
        <h3 className="portal-rules-title">奖励</h3>
        <p className="portal-rules-intro">
          每周结算时按<strong>组内名次</strong>发放金币，名次越高奖励越多；
          <strong>段位越高，同名次的金币也越多</strong>：
        </p>
        <table className="portal-rules-reward-table">
          <thead>
            <tr>
              <th>组内名次</th>
              {TIER_LIST.map((t) => (
                <th
                  key={t.id}
                  className={
                    currentTierId === t.id
                      ? "portal-rules-reward-col--me"
                      : undefined
                  }
                >
                  <img
                    className="portal-rules-reward-badge"
                    src={PORTAL_3D_TIER_BADGES[t.id]}
                    alt={t.label}
                  />
                  <span>{t.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REWARD_MATRIX.map((r) => (
              <tr key={r.range}>
                <td>
                  <span
                    className={`portal-rules-zone-mark ${ZONE_MARKS[r.zone].className}`}
                  >
                    {ZONE_MARKS[r.zone].mark}
                  </span>
                  {r.range}
                </td>
                {TIER_LIST.map((t) => (
                  <td
                    key={t.id}
                    className={`portal-rules-reward-coins${
                      currentTierId === t.id
                        ? " portal-rules-reward-col--me"
                        : ""
                    }`}
                  >
                    {r.coins[t.id] == null ? "—" : <>🪙 {r.coins[t.id]}</>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="portal-rules-reward-legend">
          <span className="portal-rules-zone-mark portal-rules-zone-mark--promote">↑</span>
          晋级下一段位
          <span className="portal-rules-zone-mark portal-rules-zone-mark--keep">–</span>
          保持段位
          <span className="portal-rules-zone-mark portal-rules-zone-mark--demote">↓</span>
          降至下一段位
        </p>
        <div className="portal-rules-card">
          <ul>
            <li>金币可在 <strong>SHOP 兑换商店</strong>中兑换奖励；</li>
            <li>结算时间以主页顶部的<strong>本周剩余倒计时</strong>为准；</li>
            <li>奖励数值以当期活动配置为准。</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
