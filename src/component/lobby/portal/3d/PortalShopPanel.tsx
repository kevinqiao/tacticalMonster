import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AudioBus } from "host/service/audio";

import type {
  PortalAdCoinOffer,
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
  giftCardOrderCount?: number;
  onOpenGiftCardOrders?: () => void;
  onPurchase: (
    skuId: string
  ) => Promise<{ ok: boolean; error?: string; skuKind?: string; orderId?: string }>;
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
};

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

export function PortalShopPanel({
  coins,
  skus,
  redemptionProfile,
  giftCardOrderCount = 0,
  onOpenGiftCardOrders,
  onPurchase,
  onSyncProfile,
  verifiedEmail,
  verifiedPhone,
  onFeedback,
  adCoinOffer = null,
  onWatchAdForCoins,
}: PortalShopPanelProps) {
  const { t } = useTranslation("portal.player");
  const coinIcon = PORTAL_SHOP_COIN_ICON;
  const ticketIcon = PORTAL_SHOP_TICKET_ICON;
  const [buying, setBuying] = useState<string | null>(null);
  const [watchingAd, setWatchingAd] = useState(false);
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

  const skuGroups = useMemo(
    () => groupPortalShopSkus(skus, resolveSectionLabel),
    [skus, resolveSectionLabel]
  );

  const hasGiftCardCatalog = useMemo(
    () => skus.some((s) => s.skuKind === "giftcard"),
    [skus]
  );

  const showOrdersLink = Boolean(
    onOpenGiftCardOrders && (hasGiftCardCatalog || giftCardOrderCount > 0)
  );

  const showAdCoin =
    Boolean(adCoinOffer?.enabled) &&
    typeof adCoinOffer?.rewardAmount === "number" &&
    Boolean(onWatchAdForCoins);

  const adCap = adCoinOffer?.cap ?? 0;
  const adRemaining = adCoinOffer?.remaining ?? 0;
  const adReward = adCoinOffer?.rewardAmount ?? 0;
  const adExhausted = adRemaining <= 0;

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
          onOpenGiftCardOrders?.();
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
    [coins, onFeedback, onOpenGiftCardOrders, onPurchase, t]
  );

  const handleBuy = useCallback(
    async (sku: PortalShopSkuRow) => {
      await executeBuy(sku.skuId, sku.priceCoins);
    },
    [executeBuy]
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
      const sku = skus.find((s) => s.skuId === skuId);
      if (sku) await executeBuy(skuId, sku.priceCoins);
    },
    [onSyncProfile, verifiedEmail, verifiedPhone, pendingSkuId, skus, executeBuy, onFeedback]
  );

  const hint = profileHint(redemptionProfile);

  const renderSkuItem = (sku: PortalShopSkuRow) => {
    const soldOut = sku.remainingThisWeek != null && sku.remainingThisWeek <= 0;
    const canAfford = coins >= sku.priceCoins;
    const locked = soldOut;

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
          </div>
          {sku.description ? <p className="portal-shop-panel__desc">{sku.description}</p> : null}
          {sku.faceValueDisplay ? (
            <p className="portal-shop-panel__grant">
              {t("shop.faceValue", { value: sku.faceValueDisplay })}
            </p>
          ) : null}
          {sku.grantReplayTokenCount > 0 ? (
            <p className="portal-shop-panel__grant">
              <img src={ticketIcon} alt="" />
              {t("shop.grantReplay", { count: sku.grantReplayTokenCount })}
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
          disabled={buying != null || watchingAd || locked}
          onClick={() => void handleBuy(sku)}
        >
          {buying === sku.skuId
            ? t("shop.buying")
            : soldOut
              ? t("shop.soldOut")
              : <><img src={coinIcon} alt="" />{sku.priceCoins}</>}
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
            onClick={onOpenGiftCardOrders}
          >
            {t("shop.ordersToggle")}
            {giftCardOrderCount > 0 ? (
              <span className="portal-shop-panel__ordersCount">{giftCardOrderCount}</span>
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
              disabled={watchingAd || buying != null || adExhausted}
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
          showAdCoin ? null : (
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
