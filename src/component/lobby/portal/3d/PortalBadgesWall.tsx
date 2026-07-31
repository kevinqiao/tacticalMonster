import React, { useMemo, useState } from "react";

import {
  PORTAL_3D_TIER_BADGES,
  type PortalTierId,
} from "./portalGame3DTheme";

export type PortalBadgeWallItem = {
  badgeId: string;
  title: string;
  description: string;
  category: string;
  iconKey: string;
  threshold: number;
  progress: number;
  unlocked: boolean;
  unlockedAt: number | null;
};

type Props = {
  items: PortalBadgeWallItem[];
  pastSeasonMarks?: PortalBadgeWallItem[];
  scrollToBadges?: boolean;
};

const CATEGORY_ORDER = [
  "league_peak",
  "climb",
  "crowns",
  "wins",
  "collector",
  "season_marks",
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  league_peak: "League Peak",
  climb: "Climb",
  crowns: "Crowns",
  wins: "Wins",
  collector: "Collector",
  season_marks: "Season Marks",
};

function iconUrl(iconKey: string): string {
  if (iconKey.startsWith("tier_")) {
    const tier = iconKey.replace("tier_", "") as PortalTierId;
    return PORTAL_3D_TIER_BADGES[tier] ?? PORTAL_3D_TIER_BADGES.bronze;
  }
  if (iconKey === "crown" || iconKey.startsWith("season_")) {
    return "/assets/portal/3d/ui/icon-trophy-gold.webp";
  }
  if (iconKey === "climb") {
    return "/assets/portal/3d/ui/icon-leaderboard.webp";
  }
  if (iconKey === "wins") {
    return "/assets/portal/3d/ui/icon-swords.webp";
  }
  return "/assets/portal/3d/ui/icon-trophy-gold.webp";
}

export function PortalBadgesWall({
  items,
  pastSeasonMarks = [],
  scrollToBadges,
}: Props) {
  const [detail, setDetail] = useState<PortalBadgeWallItem | null>(null);
  const groups = useMemo(() => {
    const map = new Map<string, PortalBadgeWallItem[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const item of items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return CATEGORY_ORDER.map((cat) => ({
      cat,
      label: CATEGORY_LABEL[cat] ?? cat,
      rows: map.get(cat) ?? [],
    })).filter((g) => g.rows.length > 0);
  }, [items]);

  return (
    <div
      className="portal-badges-wall"
      id="portal-badges-wall"
      ref={(el) => {
        if (el && scrollToBadges) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }}
    >
      <h3 className="portal-badges-wall__title">Badges</h3>
      {groups.map((g) => {
        const unlockedN = g.rows.filter((r) => r.unlocked).length;
        return (
          <section key={g.cat} className="portal-badges-wall__group">
            <h4 className="portal-badges-wall__group-title">
              {g.label}{" "}
              <span>
                {unlockedN}/{g.rows.length}
              </span>
            </h4>
            <div className="portal-badges-wall__grid">
              {g.rows.map((item) => (
                <button
                  key={item.badgeId}
                  type="button"
                  className={`portal-badges-wall__item${
                    item.unlocked ? "" : " portal-badges-wall__item--locked"
                  }`}
                  onClick={() => setDetail(item)}
                >
                  <span
                    className="portal-badges-wall__icon"
                    style={{ backgroundImage: `url(${iconUrl(item.iconKey)})` }}
                    aria-hidden
                  />
                  <span className="portal-badges-wall__name">{item.title}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
      {pastSeasonMarks.length > 0 ? (
        <section className="portal-badges-wall__group">
          <h4 className="portal-badges-wall__group-title">Past seasons</h4>
          <div className="portal-badges-wall__grid">
            {pastSeasonMarks.map((item) => (
              <button
                key={item.badgeId}
                type="button"
                className="portal-badges-wall__item"
                onClick={() => setDetail(item)}
              >
                <span
                  className="portal-badges-wall__icon"
                  style={{ backgroundImage: `url(${iconUrl(item.iconKey)})` }}
                  aria-hidden
                />
                <span className="portal-badges-wall__name">{item.title}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {detail ? (
        <div
          className="portal-badge-detail"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetail(null)}
        >
          <div
            className="portal-badge-detail__card"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className={`portal-badges-wall__icon portal-badge-detail__icon${
                detail.unlocked ? "" : " portal-badges-wall__item--locked"
              }`}
              style={{ backgroundImage: `url(${iconUrl(detail.iconKey)})` }}
            />
            <h3>{detail.title}</h3>
            <p className="portal-badge-detail__status">
              {detail.unlocked ? "Unlocked" : "Locked"}
            </p>
            <p className="portal-badge-detail__desc">{detail.description}</p>
            {!detail.unlocked ? (
              <p className="portal-badge-detail__progress">
                {detail.progress} / {detail.threshold}
              </p>
            ) : null}
            <button
              type="button"
              className="portal-badge-detail__ok"
              onClick={() => setDetail(null)}
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
