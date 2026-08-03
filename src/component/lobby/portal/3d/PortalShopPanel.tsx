import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AudioBus } from "host/service/audio";

import type {
  PortalAdCoinOffer,
  PortalDailyCheckinStatus,
  PortalRedemptionProfileView,
  PortalShopSkuRow,
} from "../service/usePortalManager";
import { portalPurchaseErrorMessage } from "../shared/portalErrorMessage";
import { PortalRegionSelectModal } from "./PortalRegionSelectModal";
import { groupPortalShopSkus } from "./portalShopLayout";
const PORTAL_SHOP_COIN_ICON = "/assets/portal/3d/ui/icon-coin.webp";
const PORTAL_SHOP_TICKET_ICON = "/assets/portal/3d/ui/icon-ticket.webp";

type PortalShopPanelProps = {
  coins: number;
  skus: PortalShopSkuRow[];
  redemptionProfile?: PortalRedemptionProfileView | null;
  /** Unified shop orders (giftcard + iap). */
  orderCount?: number;
  onOpenOrders?: () => void;
  /** @deprecated Use orderCount */
  giftCardOrderCount?: number;
  /** @deprecated Use onOpenOrders */
  onOpenGiftCardOrders?: () => void;
  onPurchase: (
    skuId: string
  ) => Promise<{ ok: boolean; error?: string; skuKind?: string; orderId?: string }>;
  /** Stripe Checkout for iap SKUs; omitted in embed hosts. */
  onStripeCheckout?: (
    skuId: string
  ) => Promise<{ ok: boolean; error?: string; url?: string }>;
  /** When false, hide iap SKUs (CrazyGames / partner embed). Default true. */
  stripeCheckoutEnabled?: boolean;
  onSyncProfile?: (args: {
    verifiedEmail?: string;
    verifiedPhone?: string;
    redemptionRegion?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  verifiedEmail?: string;
  verifiedPhone?: string;
  onFeedback?: (message: string | null) => void;
  /** 自营看广告领金币；null/undefined 时不展示 */
  adCoinOffer?: PortalAdCoinOffer | null;
  onWatchAdForCoins?: () => Promise<
    | { ok: true; coinsGranted: number; remaining: number; rewardAmount: number }
    | { ok: false; error: string }
  >;
  /** 每日签到发门票；null/undefined 时不展示 */
  dailyCheckin?: PortalDailyCheckinStatus | null;
  onClaimDailyCheckin?: () => Promise<
    | {
        ok: true;
        ticketsGranted: number;
        streakCount: number;
        dayInCycle: number;
        alreadyClaimed?: boolean;
      }
    | { ok: false; error: string }
  >;
};

function checkinErrorMessage(
  t: (key: string, opts?: Record<string, unknown>) => string,
  error: string
): string {
  const key = `shop.checkin.errors.${error}`;
  const translated = t(key, { defaultValue: "" });
  if (translated) return translated;
  return t("shop.checkin.errors.generic");
}

/** 周期内已点亮档位数（与 streakCount 取模一致）。 */
function checkinFilledSlots(streakCount: number, cycleDays: number): number {
  if (streakCount <= 0) return 0;
  const r = streakCount % cycleDays;
  return r === 0 ? cycleDays : r;
}

function profileHint(profile?: PortalRedemptionProfileView | null): string | null {
  if (!profile) return null;
  if (profile.eligible) return null;
  return portalPurchaseErrorMessage(profile.ineligibleReason ?? undefined);
}

function sectionLabelKey(sectionId: string): string {
  return `shop.sections.${sectionId}`;
}

function adCoinErrorMessage(
  t: (key: string, opts?: Record<string, unknown>) => string,
  error: string
): string {
  const key = `shop.adCoin.errors.${error}`;
  const translated = t(key, { defaultValue: "" });
  if (translated) return translated;
  return t("shop.adCoin.errors.generic");
}

function ticketGrant(sku: PortalShopSkuRow): number {
  return sku.grantTicketCount ?? sku.grantReplayTokenCount ?? 0;
}

function formatFiatPrice(sku: PortalShopSkuRow): string {
  const cents = sku.priceCents ?? 0;
  const currency = (sku.currency ?? "usd").toUpperCase();
  const amount = (cents / 100).toFixed(2);
  if (currency === "USD") return `$${amount}`;
  return `${amount} ${currency}`;
}

export function PortalShopPanel({
  coins,
  skus,
  redemptionProfile,
  orderCount,
  onOpenOrders,
  giftCardOrderCount = 0,
  onOpenGiftCardOrders,
  onPurchase,
  onStripeCheckout,
  stripeCheckoutEnabled = true,
  onSyncProfile,
  verifiedEmail,
  verifiedPhone,
  onFeedback,
  adCoinOffer = null,
  onWatchAdForCoins,
  dailyCheckin = null,
  onClaimDailyCheckin,
}: PortalShopPanelProps) {
  const { t } = useTranslation("portal.player");
  const coinIcon = PORTAL_SHOP_COIN_ICON;
  const ticketIcon = PORTAL_SHOP_TICKET_ICON;
  const [buying, setBuying] = useState<string | null>(null);
  const [watchingAd, setWatchingAd] = useState(false);
  const [claimingCheckin, setClaimingCheckin] = useState(false);
  const [inlineNote, setInlineNote] = useState<string | null>(null);
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [pendingSkuId, setPendingSkuId] = useState<string | null>(null);

  useEffect(() => {
    if (!onSyncProfile) return;
    void onSyncProfile({
      ...(verifiedEmail ? { verifiedEmail } : {}),
      ...(verifiedPhone ? { verifiedPhone } : {}),
    });
  }, [onSyncProfile, verifiedEmail, verifiedPhone]);

  const resolveSectionLabel = useCallback(
    (sectionId: string) => {
      const key = sectionLabelKey(sectionId);
      return t(key, { defaultValue: sectionId });
    },
    [t]
  );

  const visibleSkus = useMemo(() => {
    if (stripeCheckoutEnabled && onStripeCheckout) return skus;
    return skus.filter((s) => s.skuKind !== "iap");
  }, [onStripeCheckout, skus, stripeCheckoutEnabled]);

  const skuGroups = useMemo(
    () => groupPortalShopSkus(visibleSkus, resolveSectionLabel),
    [visibleSkus, resolveSectionLabel]
  );

  const openOrders = onOpenOrders ?? onOpenGiftCardOrders;
  const ordersCount = orderCount ?? giftCardOrderCount;

  const hasGiftCardCatalog = useMemo(
    () => visibleSkus.some((s) => s.skuKind === "giftcard"),
    [visibleSkus]
  );
  const hasIapCatalog = useMemo(
    () => visibleSkus.some((s) => s.skuKind === "iap"),
    [visibleSkus]
  );

  const showOrdersLink = Boolean(
    openOrders && (hasGiftCardCatalog || hasIapCatalog || ordersCount > 0)
  );

  const showAdCoin =
    Boolean(adCoinOffer?.enabled) &&
    typeof adCoinOffer?.rewardAmount === "number" &&
    Boolean(onWatchAdForCoins);

  const showCheckin =
    Boolean(dailyCheckin?.enabled) && Boolean(onClaimDailyCheckin);

  const adCap = adCoinOffer?.cap ?? 0;
  const adRemaining = adCoinOffer?.remaining ?? 0;
  const adReward = adCoinOffer?.rewardAmount ?? 0;
  const adExhausted = adRemaining <= 0;

  const checkinClaimed = Boolean(dailyCheckin?.claimedToday);
  const checkinCycleDays = dailyCheckin?.streakCycleDays ?? 7;
  const checkinFilled = checkinFilledSlots(
    dailyCheckin?.streakCount ?? 0,
    checkinCycleDays
  );
  const checkinTodaySlot = checkinClaimed
    ? null
    : checkinFilled >= checkinCycleDays
      ? 0
      : checkinFilled;
  const checkinReward = dailyCheckin?.rewardTickets ?? 0;
  const checkinCycleRewards = dailyCheckin?.cycleRewards ?? [];

  const executeBuy = useCallback(
    async (skuId: string, priceCoins: number) => {
      if (coins < priceCoins) {
        onFeedback?.(portalPurchaseErrorMessage("insufficient_coins"));
        return;
      }
      setBuying(skuId);
      setInlineNote(null);
      onFeedback?.(null);
      try {
        const r = await onPurchase(skuId);
        if (r.ok) {
          AudioBus.emit("meta.shop.purchase.success");
        }
        const message = r.ok
          ? r.skuKind === "giftcard"
            ? t("shop.giftCardProcessing")
            : t("shop.success")
          : portalPurchaseErrorMessage(r.error);
        if (r.ok && r.skuKind === "giftcard") {
          openOrders?.();
        }
        if (onFeedback) {
          onFeedback(message);
        } else {
          setInlineNote(message);
        }
      } finally {
        setBuying(null);
      }
    },
    [coins, onFeedback, openOrders, onPurchase, t]
  );

  const executeStripeCheckout = useCallback(
    async (skuId: string) => {
      if (!onStripeCheckout) return;
      setBuying(skuId);
      setInlineNote(null);
      onFeedback?.(null);
      try {
        const r = await onStripeCheckout(skuId);
        if (r.ok && r.url) {
          window.location.assign(r.url);
          return;
        }
        const message = portalPurchaseErrorMessage(r.error);
        if (onFeedback) onFeedback(message);
        else setInlineNote(message);
      } finally {
        setBuying(null);
      }
    },
    [onFeedback, onStripeCheckout]
  );

  const handleBuy = useCallback(
    async (sku: PortalShopSkuRow) => {
      if (sku.skuKind === "iap") {
        await executeStripeCheckout(sku.skuId);
        return;
      }
      await executeBuy(sku.skuId, sku.priceCoins);
    },
    [executeBuy, executeStripeCheckout]
  );

  const handleWatchAd = useCallback(async () => {
    if (!onWatchAdForCoins || watchingAd || adExhausted) return;
    setWatchingAd(true);
    setInlineNote(null);
    onFeedback?.(null);
    try {
      const r = await onWatchAdForCoins();
      if (r.ok) {
        const message = t("shop.adCoin.success", {
          coins: r.coinsGranted.toLocaleString(),
        });
        if (onFeedback) onFeedback(message);
        else setInlineNote(message);
      } else {
        const message = adCoinErrorMessage(t, r.error);
        if (onFeedback) onFeedback(message);
        else setInlineNote(message);
      }
    } finally {
      setWatchingAd(false);
    }
  }, [adExhausted, onFeedback, onWatchAdForCoins, t, watchingAd]);

  const handleClaimCheckin = useCallback(async () => {
    if (!onClaimDailyCheckin || claimingCheckin || checkinClaimed) return;
    setClaimingCheckin(true);
    setInlineNote(null);
    onFeedback?.(null);
    try {
      const r = await onClaimDailyCheckin();
      if (r.ok) {
        const message = r.alreadyClaimed
          ? t("shop.checkin.alreadyClaimed")
          : t("shop.checkin.success", {
              tickets: r.ticketsGranted.toLocaleString(),
            });
        if (onFeedback) onFeedback(message);
        else setInlineNote(message);
      } else {
        const message = checkinErrorMessage(t, r.error);
        if (onFeedback) onFeedback(message);
        else setInlineNote(message);
      }
    } finally {
      setClaimingCheckin(false);
    }
  }, [
    checkinClaimed,
    claimingCheckin,
    onClaimDailyCheckin,
    onFeedback,
    t,
  ]);

  const handleRegionConfirm = useCallback(
    async (region: string) => {
      setRegionModalOpen(false);
      if (!onSyncProfile) return;
      const sync = await onSyncProfile({
        redemptionRegion: region,
        ...(verifiedEmail ? { verifiedEmail } : {}),
        ...(verifiedPhone ? { verifiedPhone } : {}),
      });
      if (!sync.ok) {
        onFeedback?.(portalPurchaseErrorMessage(sync.error));
        setPendingSkuId(null);
        return;
      }
      const skuId = pendingSkuId;
      setPendingSkuId(null);
      if (!skuId) return;
      const sku = visibleSkus.find((s) => s.skuId === skuId);
      if (sku) await executeBuy(skuId, sku.priceCoins);
    },
    [
      onSyncProfile,
      verifiedEmail,
      verifiedPhone,
      pendingSkuId,
      visibleSkus,
      executeBuy,
      onFeedback,
    ]
  );

  const hint = profileHint(redemptionProfile);

  const renderSkuItem = (sku: PortalShopSkuRow) => {
    const soldOut = sku.remainingThisWeek != null && sku.remainingThisWeek <= 0;
    const isIap = sku.skuKind === "iap";
    const canAfford = isIap ? true : coins >= sku.priceCoins;
    const locked = soldOut;
    const tickets = ticketGrant(sku);
    const coinsGranted = sku.grantCoinCount ?? 0;

    return (
      <li key={sku.skuId} className="portal-shop-panel__item">
        <div className="portal-shop-panel__itemMain">
          <div className="portal-shop-panel__itemTitleRow">
            <strong>{sku.title}</strong>
            {sku.skuKind === "giftcard" ? (
              <span className="portal-shop-panel__badge">{t("shop.badgeGiftCard")}</span>
            ) : null}
            {sku.skuKind === "voucher" ? (
              <span className="portal-shop-panel__badge">{t("shop.badgeVoucher")}</span>
            ) : null}
            {isIap ? (
              <span className="portal-shop-panel__badge">{t("shop.badgeIap")}</span>
            ) : null}
          </div>
          {sku.description ? <p className="portal-shop-panel__desc">{sku.description}</p> : null}
          {sku.faceValueDisplay ? (
            <p className="portal-shop-panel__grant">
              {t("shop.faceValue", { value: sku.faceValueDisplay })}
            </p>
          ) : null}
          {tickets > 0 ? (
            <p className="portal-shop-panel__grant">
              <img src={ticketIcon} alt="" />
              {t("shop.grantTickets", { count: tickets })}
            </p>
          ) : null}
          {coinsGranted > 0 ? (
            <p className="portal-shop-panel__grant">
              <img src={coinIcon} alt="" />
              {t("shop.grantCoins", { count: coinsGranted })}
            </p>
          ) : null}
          {sku.skuKind === "voucher" && sku.voucherRewardText ? (
            <p className="portal-shop-panel__grant">
              {t("shop.voucherReward", { reward: sku.voucherRewardText })}
            </p>
          ) : null}
          {sku.weeklyPurchaseLimit != null ? (
            <p className="portal-shop-panel__limit">
              {t("shop.weeklyRemaining", {
                remaining: sku.remainingThisWeek ?? 0,
                limit: sku.weeklyPurchaseLimit,
              })}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className={
            canAfford
              ? "portal-shop-panel__buy"
              : "portal-shop-panel__buy portal-shop-panel__buy--insufficient"
          }
          disabled={buying != null || watchingAd || claimingCheckin || locked}
          onClick={() => void handleBuy(sku)}
        >
          {buying === sku.skuId
            ? isIap
              ? t("shop.redirecting")
              : t("shop.buying")
            : soldOut
              ? t("shop.soldOut")
              : isIap
                ? formatFiatPrice(sku)
                : (
                    <>
                      <img src={coinIcon} alt="" />
                      {sku.priceCoins}
                    </>
                  )}
        </button>
      </li>
    );
  };

  return (
    <div className="portal-shop-panel">
      <div className="portal-shop-panel__topbar">
        <p className="portal-shop-panel__balance">
          {t("shop.balance")}
          <span><img src={coinIcon} alt="" /> {coins.toLocaleString()}</span>
        </p>
        {showOrdersLink ? (
          <button
            type="button"
            className="portal-shop-panel__ordersLink"
            onClick={openOrders}
          >
            {t("shop.ordersToggle")}
            {ordersCount > 0 ? (
              <span className="portal-shop-panel__ordersCount">{ordersCount}</span>
            ) : null}
          </button>
        ) : null}
      </div>
      {redemptionProfile?.region ? (
        <p className="portal-shop-panel__region">
          {t("shop.region", { region: redemptionProfile.region })}
        </p>
      ) : null}
      {hint ? <p className="portal-shop-panel__note portal-shop-panel__note--warn">{hint}</p> : null}
      {inlineNote && !onFeedback ? (
        <p className="portal-shop-panel__note">{inlineNote}</p>
      ) : null}

      {showCheckin ? (
        <div
          className="portal-shop-panel__checkin"
          aria-label={t("shop.checkin.title")}
        >
          <div className="portal-shop-panel__item portal-shop-panel__item--checkin">
            <div className="portal-shop-panel__itemMain">
              <div className="portal-shop-panel__itemTitleRow">
                <strong>{t("shop.checkin.title")}</strong>
              </div>
              <p className="portal-shop-panel__desc">{t("shop.checkin.hint")}</p>
              <ol className="portal-shop-panel__checkinDays">
                {Array.from({ length: checkinCycleDays }, (_, i) => {
                  const filled = i < checkinFilled;
                  const isToday = checkinTodaySlot === i;
                  const tickets = checkinCycleRewards[i] ?? 1;
                  return (
                    <li
                      key={i}
                      className={[
                        "portal-shop-panel__checkinDay",
                        filled ? "portal-shop-panel__checkinDay--filled" : "",
                        isToday ? "portal-shop-panel__checkinDay--today" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="portal-shop-panel__checkinDayLabel">
                        {t("shop.checkin.day", { day: i + 1 })}
                      </span>
                      <span className="portal-shop-panel__checkinDayReward">
                        <img src={ticketIcon} alt="" />×{tickets}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="portal-shop-panel__limit">
                {checkinClaimed
                  ? t("shop.checkin.claimedToday")
                  : t("shop.checkin.streak", {
                      streak: dailyCheckin?.streakCount ?? 0,
                    })}
              </p>
            </div>
            <button
              type="button"
              className="portal-shop-panel__buy"
              disabled={
                claimingCheckin ||
                buying != null ||
                watchingAd ||
                checkinClaimed ||
                !dailyCheckin?.canClaim
              }
              onClick={() => void handleClaimCheckin()}
            >
              {claimingCheckin
                ? t("shop.checkin.claiming")
                : checkinClaimed
                  ? t("shop.checkin.claimed")
                  : t("shop.checkin.claim", { tickets: checkinReward })}
            </button>
          </div>
        </div>
      ) : null}

      {showAdCoin ? (
        <div className="portal-shop-panel__adCoin" aria-label={t("shop.adCoin.title")}>
          <div className="portal-shop-panel__item portal-shop-panel__item--adCoin">
            <div className="portal-shop-panel__itemMain">
              <div className="portal-shop-panel__itemTitleRow">
                <strong>{t("shop.adCoin.title")}</strong>
              </div>
              <p className="portal-shop-panel__desc">{t("shop.adCoin.hint")}</p>
              <p className="portal-shop-panel__limit">
                {t("shop.adCoin.remaining", {
                  remaining: adRemaining,
                  cap: adCap,
                })}
              </p>
            </div>
            <button
              type="button"
              className="portal-shop-panel__buy"
              disabled={
                watchingAd || buying != null || claimingCheckin || adExhausted
              }
              onClick={() => void handleWatchAd()}
            >
              {watchingAd
                ? t("shop.adCoin.watching")
                : adExhausted
                  ? t("shop.adCoin.exhausted")
                  : t("shop.adCoin.watch", { coins: adReward })}
            </button>
          </div>
        </div>
      ) : null}

      <div className="portal-shop-panel__catalog">
        {skuGroups.length === 0 ? (
          showAdCoin || showCheckin ? null : (
            <p className="portal-shop-panel__empty">{t("shop.empty")}</p>
          )
        ) : (
          skuGroups.map((group) => (
            <section
              key={group.sectionId ?? "__flat__"}
              className="portal-shop-panel__section"
              aria-label={group.label ?? undefined}
            >
              {group.label ? (
                <h3 className="portal-shop-panel__sectionTitle">{group.label}</h3>
              ) : null}
              <ul className="portal-shop-panel__list">{group.items.map(renderSkuItem)}</ul>
            </section>
          ))
        )}
      </div>

      <PortalRegionSelectModal
        open={regionModalOpen}
        onClose={() => {
          setRegionModalOpen(false);
          setPendingSkuId(null);
        }}
        onConfirm={(region) => void handleRegionConfirm(region)}
      />
    </div>
  );
}
