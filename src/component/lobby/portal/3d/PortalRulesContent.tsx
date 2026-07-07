import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  PORTAL_3D_TIER_BADGES,
  type PortalTierId,
} from "./portalGame3DTheme";
import type { Portal3DRulesAnchor } from "./PortalGame3DInner";

type RulesSection = "points" | "tiers" | "rewards";

const TIER_IDS: PortalTierId[] = ["bronze", "silver", "gold", "platinum", "diamond"];

const REWARD_MATRIX: {
  rangeKey: string;
  zone: "promote" | "keep" | "demote";
  coins: Record<PortalTierId, number | null>;
}[] = [
  {
    rangeKey: "rank1",
    zone: "promote",
    coins: { bronze: 200, silver: 300, gold: 500, platinum: 800, diamond: 1200 },
  },
  {
    rangeKey: "rank2_3",
    zone: "promote",
    coins: { bronze: 120, silver: 180, gold: 300, platinum: 480, diamond: 720 },
  },
  {
    rangeKey: "rank4_10",
    zone: "promote",
    coins: { bronze: 60, silver: 90, gold: 150, platinum: 240, diamond: 360 },
  },
  {
    rangeKey: "rank11_40",
    zone: "keep",
    coins: { bronze: 20, silver: 30, gold: 50, platinum: 80, diamond: 120 },
  },
  {
    rangeKey: "rank41_50",
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

function RulesBulletList({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((html, index) => (
        <li key={index} dangerouslySetInnerHTML={{ __html: html }} />
      ))}
    </ul>
  );
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
  const { t } = useTranslation("portal.player");
  const [activeTab, setActiveTab] = useState<RulesSection>(sectionOfAnchor(anchor));
  const sectionRefs = {
    points: useRef<HTMLDivElement>(null),
    tiers: useRef<HTMLDivElement>(null),
    rewards: useRef<HTMLDivElement>(null),
  };
  const soloRef = useRef<HTMLDivElement>(null);
  const multiRef = useRef<HTMLDivElement>(null);

  const soloBullets = t("rules.points.soloBullets", {
    returnObjects: true,
  }) as string[];
  const multiBullets = t("rules.points.multiBullets", {
    returnObjects: true,
  }) as string[];
  const tierBullets = t("rules.tiers.bullets", { returnObjects: true }) as string[];
  const footerBullets = t("rules.rewards.footerBullets", {
    returnObjects: true,
  }) as string[];

  useEffect(() => {
    if (!anchor) return;
    const target =
      anchor === "solo"
        ? soloRef.current
        : anchor === "multi"
          ? multiRef.current
          : sectionRefs[sectionOfAnchor(anchor)].current;
    const timer = window.setTimeout(() => {
      target?.scrollIntoView({ block: "start" });
    }, 60);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  const goTo = (section: RulesSection) => {
    setActiveTab(section);
    sectionRefs[section].current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const tabItems: [RulesSection, string][] = [
    ["points", t("rules.tabs.points")],
    ["tiers", t("rules.tabs.tiers")],
    ["rewards", t("rules.tabs.rewards")],
  ];

  return (
    <div className="portal-rules">
      <div className="portal-rules-tabs">
        {tabItems.map(([id, label]) => (
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

      <div ref={sectionRefs.points} className="portal-rules-section">
        <h3 className="portal-rules-title">{t("rules.points.title")}</h3>
        <p
          className="portal-rules-intro"
          dangerouslySetInnerHTML={{ __html: t("rules.points.intro") }}
        />
        <div ref={soloRef} className="portal-rules-card">
          <div className="portal-rules-card-head">
            <span className="portal-rules-card-title">{t("rules.points.soloTitle")}</span>
          </div>
          <RulesBulletList items={soloBullets} />
        </div>
        <div ref={multiRef} className="portal-rules-card">
          <div className="portal-rules-card-head">
            <span className="portal-rules-card-title">{t("rules.points.multiTitle")}</span>
          </div>
          <RulesBulletList items={multiBullets} />
        </div>
      </div>

      <div ref={sectionRefs.tiers} className="portal-rules-section">
        <h3 className="portal-rules-title">{t("rules.tiers.title")}</h3>
        <div className="portal-rules-badges">
          {TIER_IDS.map((tierId, i) => (
            <div key={tierId} className="portal-rules-badge-item">
              <img src={PORTAL_3D_TIER_BADGES[tierId]} alt={t(`tiers.${tierId}`)} />
              <span>{t(`tiers.${tierId}`)}</span>
              {i < TIER_IDS.length - 1 ? (
                <span className="portal-rules-badge-arrow">›</span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="portal-rules-card">
          <RulesBulletList items={tierBullets} />
          <div className="portal-rules-zonebar">
            <div className="portal-rules-zone portal-rules-zone--promote">
              {t("rules.tiers.zonePromote")}
            </div>
            <div className="portal-rules-zone portal-rules-zone--keep">
              {t("rules.tiers.zoneKeep")}
            </div>
            <div className="portal-rules-zone portal-rules-zone--demote">
              {t("rules.tiers.zoneDemote")}
            </div>
          </div>
          <ul>
            <li>{t("rules.tiers.resetBullet")}</li>
          </ul>
        </div>
      </div>

      <div ref={sectionRefs.rewards} className="portal-rules-section">
        <h3 className="portal-rules-title">{t("rules.rewards.title")}</h3>
        <p
          className="portal-rules-intro"
          dangerouslySetInnerHTML={{ __html: t("rules.rewards.intro") }}
        />
        <table className="portal-rules-reward-table">
          <thead>
            <tr>
              <th>{t("rules.rewards.rankColumn")}</th>
              {TIER_IDS.map((tierId) => (
                <th
                  key={tierId}
                  className={
                    currentTierId === tierId ? "portal-rules-reward-col--me" : undefined
                  }
                >
                  <img
                    className="portal-rules-reward-badge"
                    src={PORTAL_3D_TIER_BADGES[tierId]}
                    alt={t(`tiers.${tierId}`)}
                  />
                  <span>{t(`tiers.${tierId}`)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REWARD_MATRIX.map((row) => (
              <tr key={row.rangeKey}>
                <td>
                  <span
                    className={`portal-rules-zone-mark ${ZONE_MARKS[row.zone].className}`}
                  >
                    {ZONE_MARKS[row.zone].mark}
                  </span>
                  {t(`rules.rewards.ranges.${row.rangeKey}`)}
                </td>
                {TIER_IDS.map((tierId) => (
                  <td
                    key={tierId}
                    className={`portal-rules-reward-coins${
                      currentTierId === tierId ? " portal-rules-reward-col--me" : ""
                    }`}
                  >
                    {row.coins[tierId] == null ? (
                      t("common.dash")
                    ) : (
                      <>🪙 {row.coins[tierId]}</>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="portal-rules-reward-legend">
          <span className="portal-rules-zone-mark portal-rules-zone-mark--promote">↑</span>
          {t("rules.rewards.legendPromote")}
          <span className="portal-rules-zone-mark portal-rules-zone-mark--keep">–</span>
          {t("rules.rewards.legendKeep")}
          <span className="portal-rules-zone-mark portal-rules-zone-mark--demote">↓</span>
          {t("rules.rewards.legendDemote")}
        </p>
        <div className="portal-rules-card">
          <RulesBulletList items={footerBullets} />
        </div>
      </div>
    </div>
  );
}
