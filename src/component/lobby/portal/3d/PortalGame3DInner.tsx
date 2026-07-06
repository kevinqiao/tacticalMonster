import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

import { styles } from "./portal_3d_classes";
import {
  resolvePortal3DSharedBg,
  resolvePortal3DTierBadge,
  type PortalTierId,
} from "./portalGame3DTheme";
import { getBootFallbackBg } from "@/host/bootTheme";
import { markPortalBootPainted } from "@/host/bootHandoff";
import { shouldShowPortalAuthButton } from "../portalAuthButtonVisible";
import { formatWeekRemaining } from "./portalGame3DFormatters";

/** 统一规则弹窗的定位锚点：solo/multi 定位到积分段的对应模式卡 */
export type Portal3DRulesAnchor = "solo" | "multi" | "tiers" | "rewards";

export interface Portal3DTierInfo {
  tierId: PortalTierId;
  /** 例："白银 III" */
  tierLabel: string;
  /** 叠加在盾牌上的段位数字，例："III" */
  division?: string;
  /** 用户可见短组号；null 表示分组未就绪 */
  cohortNo?: number | null;
  /** 组内名次（1-based） */
  rank?: number | null;
  cohortSize?: number;
  /** 本周总积分 */
  points?: number;
  /** 按当前名次预估的结算金币；null 隐藏该行 */
  projectedCoins?: number | null;
  /** 晋升区最后一名（默认 10） */
  promoteTo?: number;
  /** 降级区第一名（默认 41） */
  demoteFrom?: number;
}

export interface PortalGame3DInnerProps {
  heroLogoUrl?: string;
  authed?: boolean;
  tier?: Portal3DTierInfo;
  /** 金币余额；null/undefined 时隐藏顶栏金币 */
  coinBalance?: number | null;
  joining?: "solo" | "multi" | null;
  soloJoinBlocked?: boolean;
  multiJoinBlocked?: boolean;
  soloOpenAssignment?: unknown;
  multiOpenAssignment?: unknown;
  queueWaiting?: boolean;
  weekEndsAt?: number | null;
  bgUrl?: string;
  pageActive?: boolean;

  onJoin?: (mode: "solo" | "multi") => void;
  /** 打开统一玩法规则弹窗并定位到对应段落 */
  onOpenRules?: (anchor: Portal3DRulesAnchor) => void;
  /** 打开统一周总榜（cohort 组榜） */
  onOpenLeaderboard?: () => void;
  onOpenFullHistory?: () => void;
  onOpenShop?: () => void;
  onSignOut?: () => void;
  onSignIn?: () => void;
  /** Top-right SignIn/SignOut; default hidden on Partner portal and embed shells. */
  showAuthButton?: boolean;
}

export function PortalGame3DInner({
  heroLogoUrl,
  authed = false,
  tier,
  coinBalance,
  joining = null,
  soloJoinBlocked = false,
  multiJoinBlocked = false,
  soloOpenAssignment,
  multiOpenAssignment,
  queueWaiting = false,
  weekEndsAt,
  bgUrl,
  onJoin,
  onOpenRules,
  onOpenLeaderboard,
  onOpenFullHistory,
  onOpenShop,
  onSignOut,
  onSignIn,
  showAuthButton,
  pageActive = true,
}: PortalGame3DInnerProps) {
  const authButtonVisible = showAuthButton ?? shouldShowPortalAuthButton();
  const containerRef = useRef<HTMLDivElement>(null);
  const shopRef = useRef<HTMLDivElement>(null);
  const authRef = useRef<HTMLDivElement>(null);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    function applyScale() {
      const container = containerRef.current;
      if (!container) return;

      const portrait = window.innerWidth / window.innerHeight < 132 / 182;
      setIsPortrait(portrait);

      const designWidth = 1440;
      const designHeight = portrait ? 2560 : 1080;

      const scaleX = window.innerWidth / designWidth;
      const scaleY = window.innerHeight / designHeight;
      const scale = Math.min(scaleX, scaleY);

      const offsetX = (window.innerWidth - designWidth * scale) / 2;
      const offsetY = (window.innerHeight - designHeight * scale) / 2;
      container.style.transform =
        `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;

      const shop = shopRef.current;
      if (shop) {
        shop.style.transform = `scale(${scale})`;
        shop.style.top = `${24 * scale}px`;
        shop.style.left = `${24 * scale}px`;
      }

      const auth = authRef.current;
      if (auth) {
        auth.style.transform = `scale(${scale})`;
        auth.style.top = `${24 * scale}px`;
        auth.style.right = `${24 * scale}px`;
      }
    }

    applyScale();
    window.addEventListener("resize", applyScale);
    return () => window.removeEventListener("resize", applyScale);
  }, []);

  const soloJoinDisabled = !authed || joining != null || soloJoinBlocked;
  const multiJoinDisabled = !authed || joining != null || multiJoinBlocked;

  const handleSoloClick = () => {
    if (!authed) {
      onSignIn?.();
    } else if (!soloJoinDisabled) {
      onJoin?.("solo");
    }
  };

  const handleMultiClick = () => {
    if (!authed) {
      onSignIn?.();
    } else if (!multiJoinDisabled) {
      onJoin?.("multi");
    }
  };

  const currentBgUrl =
    bgUrl || resolvePortal3DSharedBg(isPortrait ? "portrait" : "landscape");

  const heroStyle = heroLogoUrl
    ? {
        backgroundImage: `url(${heroLogoUrl})`,
        backgroundSize: "contain" as const,
        backgroundRepeat: "no-repeat" as const,
        backgroundPosition: "center" as const,
      }
    : undefined;

  const containerStyle = {
    width: "1440px",
    height: isPortrait ? "2560px" : "1080px",
  };

  const handleShopClick = () => {
    if (!authed) {
      onSignIn?.();
      return;
    }
    onOpenShop?.();
  };

  useLayoutEffect(() => {
    if (!pageActive) return;
    markPortalBootPainted();
  }, [pageActive]);

  return (
    <div
      className={styles.scaleWrapper}
      style={{
        backgroundImage: `url(${currentBgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: getBootFallbackBg(),
        visibility: pageActive ? "visible" : "hidden",
        pointerEvents: pageActive ? "auto" : "none",
      }}
    >
      <div
        ref={shopRef}
        className={styles.fixedShopButton}
        onClick={handleShopClick}
        style={{ cursor: "pointer" }}
        role="button"
        aria-label="Shop"
      >
        <div className={styles.fixedShopBackground}>
          <span className={styles.fixedShopText}>SHOP</span>
        </div>
        {coinBalance != null ? (
          <div className={styles.coinPill}>
            <div className={styles.coinPillIcon} />
            <span className={styles.coinPillText}>
              {coinBalance.toLocaleString()}
            </span>
          </div>
        ) : null}
      </div>
      {authButtonVisible ? (
        <div
          ref={authRef}
          className={styles.fixedAuthButton}
          onClick={authed ? onSignOut : onSignIn}
          style={{ cursor: "pointer" }}
        >
          <div className={styles.fixedAuthBackground}>
            <span className={styles.fixedAuthText}>{authed ? "SignOut" : "SignIn"}</span>
          </div>
        </div>
      ) : null}
      <div
        ref={containerRef}
        className={isPortrait ? styles.mainContainerPortrait : styles.mainContainer}
        style={containerStyle}
      >
        <div className={isPortrait ? styles.groupsPortrait : styles.groups}>
          <div className={styles.image4} style={heroStyle} />
          {weekEndsAt != null && (
            <div className={styles.clockChip}>
              <span>⏱️ {formatWeekRemaining(weekEndsAt)}</span>
            </div>
          )}
        </div>
        <div className={styles.spacer} />
        {tier ? (
          <div
            className={
              isPortrait ? styles.tierStripRowPortrait : styles.tierStripRow
            }
          >
            <div className={styles.tierStrip}>
              <div className={styles.tierBadgeWrap}>
                <div
                  className={styles.tierBadge}
                  style={{
                    backgroundImage: `url(${resolvePortal3DTierBadge(tier.tierId)})`,
                  }}
                >
                  {tier.division ? (
                    <span className={styles.tierDivision}>{tier.division}</span>
                  ) : null}
                </div>
                <span className={styles.tierName}>{tier.tierLabel}</span>
              </div>
              <div className={styles.tierCenter}>
                <div className={styles.tierTopLine}>
                  <span className={styles.tierCohortNo}>
                    {tier.cohortNo != null ? `组 #${tier.cohortNo}` : "本周分组"}
                    <span
                      className={styles.tierHelpBtn}
                      onClick={() => onOpenRules?.("tiers")}
                      role="button"
                      aria-label="Game rules"
                    />
                  </span>
                  <span className={styles.tierRankText}>
                    Rank {tier.rank != null ? `#${tier.rank}` : "—"} /{" "}
                    {tier.cohortSize ?? 50} · {tier.points ?? 0}分
                  </span>
                </div>
                <div className={styles.tierZoneBar}>
                  <div className={styles.tierZonePromote}>
                    ↑ 升级区 1-{tier.promoteTo ?? 10}
                  </div>
                  <div className={styles.tierZoneKeep}>
                    保级区 {(tier.promoteTo ?? 10) + 1}-
                    {(tier.demoteFrom ?? 41) - 1}
                  </div>
                  <div className={styles.tierZoneDemote}>
                    ↓ 降级区 {tier.demoteFrom ?? 41}-{tier.cohortSize ?? 50}
                  </div>
                  {tier.rank != null ? (
                    <div
                      className={styles.tierZoneMarker}
                      style={{
                        left: `${Math.min(
                          100,
                          Math.max(
                            0,
                            ((tier.rank - 0.5) / (tier.cohortSize ?? 50)) * 100
                          )
                        )}%`,
                      }}
                    />
                  ) : null}
                </div>
                {tier.projectedCoins != null ? (
                  <div className={styles.tierRewardLine}>
                    <span>预计结算奖励</span>
                    <div className={styles.tierRewardCoin} />
                    <span className={styles.tierRewardNum}>
                      +{tier.projectedCoins}
                    </span>
                  </div>
                ) : null}
              </div>
              <div className={styles.tierBtnGroup}>
                <div
                  className={styles.tierLbBtn}
                  onClick={onOpenLeaderboard}
                  role="button"
                  aria-label="Leaderboard"
                >
                  <div className={styles.tierLbBtnBg}>
                    <div className={styles.tierLbTrophy} />
                    <span className={styles.tierLbText}>LEADERBOARD</span>
                  </div>
                </div>
                <div
                  className={styles.tierHistoryBtn}
                  onClick={onOpenFullHistory}
                  role="button"
                  aria-label="History"
                  style={{ opacity: onOpenFullHistory ? 1 : 0.6 }}
                >
                  <div className={styles.tierLbBtnBg}>
                    <div className={styles.tierHistoryIcon} />
                    <span className={styles.tierLbText}>HISTORY</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className={isPortrait ? styles.flexRowBPortrait : styles.flexRowB}>
          <div className={styles.groups5}>
            <div className={`${styles.modeCard} ${styles.modeCardSolo}`}>
              <div className={styles.modeCardTopRow}>
                <div className={styles.modeIconSolo} />
                <span className={styles.modeTitle}>CHALLENGE</span>
              </div>
              <div
                className={`${styles.modePlayBtn} ${styles.modePlayBtnSolo}`}
                onClick={handleSoloClick}
                style={{
                  cursor: !authed || !soloJoinDisabled ? "pointer" : "not-allowed",
                  opacity: authed && soloJoinDisabled ? 0.7 : 1,
                }}
              >
                <span className={styles.modePlayText}>
                  {joining === "solo"
                    ? "JOINING..."
                    : soloOpenAssignment
                      ? "CONTINUE"
                      : "PLAY"}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.groups10}>
            <div className={`${styles.modeCard} ${styles.modeCardArena}`}>
              <div className={styles.modeCardTopRow}>
                <div className={styles.modeIconArena} />
                <span className={styles.modeTitle}>ARENA</span>
              </div>
              <div
                className={`${styles.modePlayBtn} ${styles.modePlayBtnArena}`}
                onClick={handleMultiClick}
                style={{
                  cursor: !authed || !multiJoinDisabled ? "pointer" : "not-allowed",
                  opacity: authed && multiJoinDisabled ? 0.7 : 1,
                }}
              >
                <span className={styles.modePlayText}>
                  {joining === "multi"
                    ? "MATCHING..."
                    : queueWaiting
                      ? "MATCHING..."
                      : multiOpenAssignment
                        ? "CONTINUE"
                        : "PLAY"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
