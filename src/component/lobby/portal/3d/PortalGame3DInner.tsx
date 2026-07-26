import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { styles } from "./portal_3d_classes";
import {
  resolvePortal3DSharedBg,
  resolvePortal3DTierBadge,
  type PortalTierId,
} from "./portalGame3DTheme";
import type { RegisteredPartnerGameType } from "@/convex/portal/convex/data/partnerGameRegistry";
import type { PortalWeeklyLeagueUnclaimedRewards } from "../service/usePortalManager";
import { getBootFallbackBg } from "@/host/bootTheme";
import { markPortalBootPainted } from "@/host/bootHandoff";
import {
  shouldShowPortalAccountChrome,
  shouldShowPortalAuthMenuActions,
} from "../portalAuthButtonVisible";
import { CasualAdReplayVideoIcon } from "@/component/battle/games/shared/CasualAdReplayVideoIcon";
import { formatWeekRemaining } from "./portalGame3DFormatters";

/** 统一规则弹窗的定位锚点：solo/multi 定位到积分段的对应模式卡 */
export type Portal3DRulesAnchor = "solo" | "multi" | "tiers" | "rewards";

export interface Portal3DTierInfo {
  tierId: PortalTierId;
  /** 例："白银 III" */
  tierLabel: string;
  /** 叠加在盾牌上的段位数字，例："III" */
  division?: string;
  /** 用户可见 8 位字母数字组号；null 表示分组未就绪 */
  cohortNo?: string | null;
  /** 组内名次（1-based） */
  rank?: number | null;
  /** 设计容量（三区条 / 降级文案 to） */
  cohortSize?: number;
  /** 当前可见人数（名次 #x / N） */
  cohortMemberCount?: number;
  /** 本周总积分 */
  points?: number;
  /** 按当前名次预估的结算金币；null 隐藏该行 */
  projectedCoins?: number | null;
  /** 晋升区最后一名（默认 10） */
  promoteTo?: number;
  /** 降级区第一名（默认 23） */
  demoteFrom?: number;
}

export interface PortalGame3DInnerProps {
  gameType?: RegisteredPartnerGameType | null;
  heroLogoUrl?: string;
  authed?: boolean;
  tier?: Portal3DTierInfo;
  /** 金币余额；null/undefined 时隐藏顶栏金币（未登录不传） */
  coinBalance?: number | null;
  /** 门票余额；null/undefined 时隐藏顶栏门票（未登录不传） */
  ticketBalance?: number | null;
  joining?: "solo" | "multi" | null;
  soloJoinBlocked?: boolean;
  multiJoinBlocked?: boolean;
  soloOpenAssignment?: unknown;
  multiOpenAssignment?: unknown;
  /** 今日已挑战次数（单人：含金币桌等全部对局；主页文案用） */
  soloPlaysToday?: number;
  /** 免费/广告/门票阶梯今日次数（单人；开始按钮 used/cap 用） */
  soloLadderPlaysToday?: number;
  /** 免费每日上限（单人；按钮 used/cap 用） */
  soloMaxPlaysPerDay?: number;
  /** 今日已挑战次数（多人：含金币桌等全部对局；主页文案用） */
  multiPlaysToday?: number;
  /** 免费/广告/门票阶梯今日次数（多人；开始按钮 used/cap 用） */
  multiLadderPlaysToday?: number;
  /** 免费每日上限（多人；按钮 used/cap 用） */
  multiMaxPlaysPerDay?: number;
  /** 单人今日次数已用尽（无进行中对局时「开始」应灰掉） */
  soloDailyExhausted?: boolean;
  /** 多人今日次数已用尽 */
  multiDailyExhausted?: boolean;
  /** 免费用尽后可看广告入场 */
  soloAdEntryAvailable?: boolean;
  multiAdEntryAvailable?: boolean;
  soloTicketEntryAvailable?: boolean;
  multiTicketEntryAvailable?: boolean;
  soloTicketEntryPrice?: number;
  multiTicketEntryPrice?: number;
  soloTicketEntryRemaining?: number;
  multiTicketEntryRemaining?: number;
  /**
   * 该模式有多个 tournament：免费→广告 CTA 落在选择弹窗的每条记录上，
   * 主页模式框只显示「开始 / 继续」。
   */
  soloHasMultipleOfferings?: boolean;
  multiHasMultipleOfferings?: boolean;
  queueWaiting?: boolean;
  weekEndsAt?: number | null;
  bgUrl?: string;
  pageActive?: boolean;

  onJoin?: (mode: "solo" | "multi") => void;
  /** 打开统一玩法规则弹窗并定位到对应段落 */
  onOpenRules?: (anchor: Portal3DRulesAnchor) => void;
  /** 打开周联赛本组排行 */
  onOpenLeaderboard?: () => void;
  onOpenFullHistory?: () => void;
  onOpenShop?: () => void;
  /** Hide shop entry when catalog has no visible SKUs for this partner. Default true. */
  showShop?: boolean;
  onSignIn?: () => void;
  /** Override account chrome visibility (preview). */
  showAuthButton?: boolean;
  /** Override Sign In (embed/partner should be false). */
  showAuthMenuActions?: boolean;
  /** Open My Account panel (authed avatar click). */
  onOpenAccount?: () => void;
  /** 未领取的周联赛金币；有值时在段位条显示「待领」胶囊 */
  unclaimedRewards?: PortalWeeklyLeagueUnclaimedRewards | null;
  onOpenUnclaimedRewards?: () => void;
}

export function PortalGame3DInner({
  gameType,
  heroLogoUrl,
  authed = false,
  tier,
  coinBalance,
  ticketBalance,
  joining = null,
  soloJoinBlocked = false,
  multiJoinBlocked = false,
  soloOpenAssignment,
  multiOpenAssignment,
  soloPlaysToday = 0,
  soloLadderPlaysToday = 0,
  soloMaxPlaysPerDay = 3,
  multiPlaysToday = 0,
  multiLadderPlaysToday = 0,
  multiMaxPlaysPerDay = 10,
  soloDailyExhausted = false,
  multiDailyExhausted = false,
  soloAdEntryAvailable = false,
  multiAdEntryAvailable = false,
  soloTicketEntryAvailable = false,
  multiTicketEntryAvailable = false,
  soloTicketEntryPrice,
  multiTicketEntryPrice,
  soloTicketEntryRemaining,
  multiTicketEntryRemaining,
  soloHasMultipleOfferings = false,
  multiHasMultipleOfferings = false,
  queueWaiting = false,
  weekEndsAt,
  bgUrl,
  onJoin,
  onOpenRules,
  onOpenLeaderboard,
  onOpenFullHistory,
  onOpenShop,
  showShop = true,
  onSignIn,
  showAuthButton,
  showAuthMenuActions: showAuthMenuActionsProp,
  onOpenAccount,
  unclaimedRewards,
  onOpenUnclaimedRewards,
  pageActive = true,
}: PortalGame3DInnerProps) {
  const { t } = useTranslation("portal.player");
  const showAuthActions =
    showAuthMenuActionsProp ?? shouldShowPortalAuthMenuActions();
  const accountChromeVisible =
    showAuthButton ?? shouldShowPortalAccountChrome(authed);
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleWrapperRef = useRef<HTMLDivElement>(null);
  const shopRef = useRef<HTMLDivElement>(null);
  const authRef = useRef<HTMLDivElement>(null);
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const wrapper = scaleWrapperRef.current;
    if (!wrapper) return;

    function applyScale() {
      const container = containerRef.current;
      if (!container || !wrapper) return;

      const viewW = wrapper.clientWidth;
      const viewH = wrapper.clientHeight;
      if (viewW <= 0 || viewH <= 0) return;

      const portrait = viewW / viewH < 132 / 182;
      setIsPortrait(portrait);

      const designWidth = 1440;
      const designHeight = portrait ? 2560 : 1080;

      const scaleX = viewW / designWidth;
      const scaleY = viewH / designHeight;
      const scale = Math.min(scaleX, scaleY);

      const offsetX = (viewW - designWidth * scale) / 2;
      const offsetY = (viewH - designHeight * scale) / 2;
      container.style.transform =
        `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;

      // Keep corner chrome readable/tappable on phones (canvas scale ~0.27).
      // Auth needs a larger floor; shop art is already wide — use a lower floor.
      const authChromeScale = Math.min(1, Math.max(scale, 0.6));
      const shopChromeScale = Math.min(1, Math.max(scale, 0.4));

      const shop = shopRef.current;
      if (shop) {
        shop.style.transform = `scale(${shopChromeScale})`;
        shop.style.top = `${24 * shopChromeScale}px`;
        shop.style.left = `${24 * shopChromeScale}px`;
      }

      const auth = authRef.current;
      if (auth) {
        auth.style.transform = `scale(${authChromeScale})`;
        auth.style.top = `${24 * authChromeScale}px`;
        auth.style.right = `${24 * authChromeScale}px`;
      }
    }

    applyScale();
    const observer = new ResizeObserver(() => applyScale());
    observer.observe(wrapper);
    window.addEventListener("resize", applyScale);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", applyScale);
    };
  }, []);

  const soloJoinDisabled = !authed || joining != null || soloJoinBlocked;
  const multiJoinDisabled = !authed || joining != null || multiJoinBlocked;
  /** 不可新开且无「继续」时灰掉（含免费/广告/门票用尽；金币桌不受此限） */
  const soloStartGrayed = authed && !soloOpenAssignment && soloJoinDisabled;
  const multiStartGrayed =
    authed && !multiOpenAssignment && !queueWaiting && multiJoinDisabled;

  // 免费按钮展示（used/cap）；次数用尽且无广告/门票时灰掉，只显示「开始」
  // 多 tournament 时入场 CTA 在选择弹窗里，主页模式框只显示「开始」
  const soloFreeExhaustedNoAlt =
    soloDailyExhausted && !soloAdEntryAvailable && !soloTicketEntryAvailable;
  const multiFreeExhaustedNoAlt =
    multiDailyExhausted && !multiAdEntryAvailable && !multiTicketEntryAvailable;
  const soloFreePlayLabel = soloHasMultipleOfferings
    ? t("lobby.play")
    : soloFreeExhaustedNoAlt
      ? t("lobby.play")
      : t("lobby.playFree", {
          used: Math.min(soloLadderPlaysToday, soloMaxPlaysPerDay),
          cap: soloMaxPlaysPerDay,
        });
  const multiFreePlayLabel = multiHasMultipleOfferings
    ? t("lobby.play")
    : multiFreeExhaustedNoAlt
      ? t("lobby.play")
      : t("lobby.playFree", {
          used: Math.min(multiLadderPlaysToday, multiMaxPlaysPerDay),
          cap: multiMaxPlaysPerDay,
        });
  const adEntryLabel = t("lobby.playWatchAd");
  const soloShowEntryCtaOnHome = !soloHasMultipleOfferings;
  const multiShowEntryCtaOnHome = !multiHasMultipleOfferings;

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
    bgUrl ||
    resolvePortal3DSharedBg(isPortrait ? "portrait" : "landscape", gameType);

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

  const promoteTo = tier?.promoteTo ?? 8;
  const demoteFrom = tier?.demoteFrom ?? 23;
  const cohortSize = tier?.cohortSize ?? 30;
  const cohortMemberCount = tier?.cohortMemberCount ?? cohortSize;

  return (
    <div
      ref={scaleWrapperRef}
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
      <div ref={shopRef} className={styles.fixedShopCluster}>
        {showShop ? (
          <div
            className={styles.fixedShopButton}
            onClick={handleShopClick}
            style={{ cursor: "pointer" }}
            role="button"
            aria-label={
              coinBalance != null
                ? t("lobby.shopWithBalanceAria", {
                    coins: coinBalance.toLocaleString(),
                  })
                : t("lobby.shopAria")
            }
          >
            <div className={styles.fixedShopBackground}>
              <span className={styles.fixedShopGem} aria-hidden />
              <span className={styles.fixedShopText}>{t("lobby.shop")}</span>
            </div>
          </div>
        ) : null}
        {coinBalance != null || ticketBalance != null ? (
          <div className={styles.balanceChipRow} aria-hidden>
            {coinBalance != null ? (
              <div className={styles.coinChip}>
                <span className={styles.coinChipIcon} />
                <span className={styles.coinChipText}>{coinBalance.toLocaleString()}</span>
              </div>
            ) : null}
            {ticketBalance != null ? (
              <div className={styles.coinChip}>
                <span className={styles.ticketChipIcon} aria-hidden />
                <span className={styles.coinChipText}>{ticketBalance.toLocaleString()}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {accountChromeVisible ? (
        <div ref={authRef} className={styles.fixedAuthCluster}>
          <div
            className={styles.fixedAuthButton}
            role="button"
            tabIndex={0}
            aria-label={
              authed ? t("lobby.accountMenu.openAria") : t("lobby.signIn")
            }
            onClick={() => {
              if (!authed) {
                if (showAuthActions) onSignIn?.();
                return;
              }
              onOpenAccount?.();
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              if (!authed) {
                if (showAuthActions) onSignIn?.();
                return;
              }
              onOpenAccount?.();
            }}
            style={{ cursor: "pointer" }}
          >
            <div className={styles.fixedAuthBackground}>
              <span className={styles.fixedAuthIcon} aria-hidden />
            </div>
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
                  className={`${styles.tierBadge}${authed ? "" : ` ${styles.tierBadgeLocked}`}`}
                  style={{
                    backgroundImage: `url(${resolvePortal3DTierBadge(tier.tierId)})`,
                  }}
                  aria-hidden={!authed}
                >
                  {authed && tier.division ? (
                    <span className={styles.tierDivision}>{tier.division}</span>
                  ) : null}
                </div>
                {authed ? (
                  <span className={styles.tierName}>{tier.tierLabel}</span>
                ) : null}
              </div>
              <div className={styles.tierCenter}>
                <div className={styles.tierTopLine}>
                  {/* Portrait: hide cohort id to free vertical space; keep ? next to rank */}
                  {!isPortrait ? (
                    <span className={styles.tierCohortNo}>
                      {tier.cohortNo != null
                        ? t("lobby.cohortLabel", { no: tier.cohortNo })
                        : t("lobby.cohortPending")}
                      <span
                        className={styles.tierHelpBtn}
                        onClick={() => onOpenRules?.("tiers")}
                        role="button"
                        aria-label={t("lobby.rulesAria")}
                      />
                    </span>
                  ) : null}
                  <span className={styles.tierRankText}>
                    {t("lobby.rankLabel", {
                      rank: tier.rank != null ? `#${tier.rank}` : t("common.dash"),
                      size: cohortMemberCount,
                    })}
                    {isPortrait ? (
                      <span
                        className={styles.tierHelpBtn}
                        onClick={() => onOpenRules?.("tiers")}
                        role="button"
                        aria-label={t("lobby.rulesAria")}
                      />
                    ) : null}
                  </span>
                </div>
                <div className={styles.tierZoneBar}>
                  <div className={styles.tierZonePromote}>
                    {t("lobby.zonePromote", { from: 1, to: promoteTo })}
                  </div>
                  <div className={styles.tierZoneKeep}>
                    {t("lobby.zoneKeep", { from: promoteTo + 1, to: demoteFrom - 1 })}
                  </div>
                  <div className={styles.tierZoneDemote}>
                    {t("lobby.zoneDemote", { from: demoteFrom, to: cohortSize })}
                  </div>
                  {tier.rank != null ? (
                    <div
                      className={styles.tierZoneMarker}
                      style={{
                        left: `${Math.min(
                          100,
                          Math.max(
                            0,
                            ((tier.rank - 0.5) / cohortSize) * 100
                          )
                        )}%`,
                      }}
                    />
                  ) : null}
                </div>
                {/* Portrait: hide projected settlement text; keep claimable chip if any */}
                {(!isPortrait && tier.projectedCoins != null) ||
                (unclaimedRewards && unclaimedRewards.coins > 0) ? (
                  <div className={styles.tierRewardLine}>
                    {!isPortrait && tier.projectedCoins != null ? (
                      <div className={styles.tierRewardLineMain}>
                        <span>{t("lobby.projectedReward")}</span>
                        <div className={styles.tierRewardCoin} />
                        <span className={styles.tierRewardNum}>
                          +{tier.projectedCoins}
                        </span>
                      </div>
                    ) : null}
                    {unclaimedRewards && unclaimedRewards.coins > 0 ? (
                      <div
                        className={styles.tierUnclaimedChip}
                        onClick={onOpenUnclaimedRewards}
                        role="button"
                        aria-label={t("lobby.unclaimedCoinsAria", {
                          coins: unclaimedRewards.coins.toLocaleString(),
                        })}
                      >
                        <span className={styles.tierUnclaimedIcon} aria-hidden />
                        <span className={styles.tierUnclaimedText}>
                          {t("lobby.unclaimedCoins", {
                            coins: unclaimedRewards.coins.toLocaleString(),
                          })}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className={styles.tierBtnGroup}>
                <div
                  className={`${styles.tierLbBtn}${authed ? "" : ` ${styles.tierActionDisabled}`}`}
                  onClick={authed ? onOpenLeaderboard : undefined}
                  role="button"
                  aria-label={t("lobby.leaderboardAria")}
                  aria-disabled={!authed}
                >
                  <div className={styles.tierLbBtnBg}>
                    <div className={styles.tierLbTrophy} />
                    <span className={styles.tierLbText}>{t("lobby.leaderboard")}</span>
                  </div>
                </div>
                <div
                  className={`${styles.tierHistoryBtn}${authed ? "" : ` ${styles.tierActionDisabled}`}`}
                  onClick={authed ? onOpenFullHistory : undefined}
                  role="button"
                  aria-label={t("lobby.historyAria")}
                  aria-disabled={!authed}
                >
                  <div className={styles.tierLbBtnBg}>
                    <div className={styles.tierHistoryIcon} />
                    <span className={styles.tierLbText}>{t("lobby.history")}</span>
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
                <span className={styles.modeTitle}>{t("lobby.modes.challenge")}</span>
              </div>
              {authed && soloPlaysToday > 0 ? (
                <div className={styles.modeQuota}>
                  {t("lobby.modes.playsToday", {
                    playsToday: soloPlaysToday,
                  })}
                </div>
              ) : null}
              <div
                className={`${styles.modePlayBtn} ${styles.modePlayBtnSolo}${
                  soloStartGrayed ? ` ${styles.modePlayBtnDisabled}` : ""
                }`}
                onClick={handleSoloClick}
                role="button"
                aria-disabled={soloStartGrayed || undefined}
                aria-label={
                  joining === "solo"
                    ? t("lobby.joining")
                    : soloOpenAssignment
                      ? `${t("lobby.continue")} · ${t("lobby.continueInProgress")}`
                      : soloShowEntryCtaOnHome &&
                          soloDailyExhausted &&
                          soloAdEntryAvailable
                        ? adEntryLabel
                        : soloShowEntryCtaOnHome &&
                            soloDailyExhausted &&
                            soloTicketEntryAvailable
                          ? t("lobby.playWithTickets", {
                              price: soloTicketEntryPrice ?? 1,
                            })
                          : soloFreePlayLabel
                }
                style={{
                  cursor: !authed || !soloJoinDisabled ? "pointer" : "not-allowed",
                }}
              >
                {joining === "solo" ? (
                  <span className={styles.modePlayText}>{t("lobby.joining")}</span>
                ) : soloOpenAssignment ? (
                  <span className={styles.modePlayStack}>
                    <span className={styles.modePlayText}>{t("lobby.continue")}</span>
                    <span className={styles.modePlaySubtext}>
                      {t("lobby.continueInProgress")}
                    </span>
                  </span>
                ) : soloShowEntryCtaOnHome &&
                  soloDailyExhausted &&
                  soloAdEntryAvailable ? (
                  <span className={styles.modePlayStack}>
                    <span
                      className={`${styles.modePlayText} ${styles.modePlayTextCompact}`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                    >
                      <CasualAdReplayVideoIcon />
                      {adEntryLabel}
                    </span>
                  </span>
                ) : soloShowEntryCtaOnHome &&
                  soloDailyExhausted &&
                  soloTicketEntryAvailable ? (
                  <span className={styles.modePlayStack}>
                    <span className={styles.modePlayText}>
                      {t("lobby.playWithTickets", {
                        price: soloTicketEntryPrice ?? 1,
                      })}
                    </span>
                    <span className={styles.modePlaySubtext}>
                      {t("lobby.playWithTicketsSub", {
                        remaining: soloTicketEntryRemaining ?? 0,
                      })}
                    </span>
                  </span>
                ) : (
                  <span className={`${styles.modePlayText} ${styles.modePlayTextCompact}`}>
                    {soloFreePlayLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className={styles.groups10}>
            <div className={`${styles.modeCard} ${styles.modeCardArena}`}>
              <div className={styles.modeCardTopRow}>
                <div className={styles.modeIconArena} />
                <span className={styles.modeTitle}>{t("lobby.modes.arena")}</span>
              </div>
              {authed && multiPlaysToday > 0 ? (
                <div className={styles.modeQuota}>
                  {t("lobby.modes.playsToday", {
                    playsToday: multiPlaysToday,
                  })}
                </div>
              ) : null}
              <div
                className={`${styles.modePlayBtn} ${styles.modePlayBtnArena}${
                  multiStartGrayed ? ` ${styles.modePlayBtnDisabled}` : ""
                }`}
                onClick={handleMultiClick}
                role="button"
                aria-disabled={multiStartGrayed || undefined}
                aria-label={
                  joining === "multi" || queueWaiting
                    ? t("lobby.matching")
                    : multiOpenAssignment
                      ? `${t("lobby.continue")} · ${t("lobby.continueInProgress")}`
                      : multiShowEntryCtaOnHome &&
                          multiDailyExhausted &&
                          multiAdEntryAvailable
                        ? adEntryLabel
                        : multiShowEntryCtaOnHome &&
                            multiDailyExhausted &&
                            multiTicketEntryAvailable
                          ? t("lobby.playWithTickets", {
                              price: multiTicketEntryPrice ?? 2,
                            })
                          : multiFreePlayLabel
                }
                style={{
                  cursor: !authed || !multiJoinDisabled ? "pointer" : "not-allowed",
                }}
              >
                {joining === "multi" || queueWaiting ? (
                  <span className={styles.modePlayText}>{t("lobby.matching")}</span>
                ) : multiOpenAssignment ? (
                  <span className={styles.modePlayStack}>
                    <span className={styles.modePlayText}>{t("lobby.continue")}</span>
                    <span className={styles.modePlaySubtext}>
                      {t("lobby.continueInProgress")}
                    </span>
                  </span>
                ) : multiShowEntryCtaOnHome &&
                  multiDailyExhausted &&
                  multiAdEntryAvailable ? (
                  <span className={styles.modePlayStack}>
                    <span
                      className={`${styles.modePlayText} ${styles.modePlayTextCompact}`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                    >
                      <CasualAdReplayVideoIcon />
                      {adEntryLabel}
                    </span>
                  </span>
                ) : multiShowEntryCtaOnHome &&
                  multiDailyExhausted &&
                  multiTicketEntryAvailable ? (
                  <span className={styles.modePlayStack}>
                    <span className={styles.modePlayText}>
                      {t("lobby.playWithTickets", {
                        price: multiTicketEntryPrice ?? 2,
                      })}
                    </span>
                    <span className={styles.modePlaySubtext}>
                      {t("lobby.playWithTicketsSub", {
                        remaining: multiTicketEntryRemaining ?? 0,
                      })}
                    </span>
                  </span>
                ) : (
                  <span className={`${styles.modePlayText} ${styles.modePlayTextCompact}`}>
                    {multiFreePlayLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
