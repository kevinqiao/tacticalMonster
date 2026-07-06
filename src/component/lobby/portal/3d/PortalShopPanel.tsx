import React, { useCallback, useState } from "react";

export type PortalShopSkuRow = {
  skuId: string;
  title: string;
  description: string;
  priceCoins: number;
  grantReplayTokenCount: number;
  weeklyPurchaseLimit: number | null;
  purchasedThisWeek: number;
  remainingThisWeek: number | null;
};

type PortalShopPanelProps = {
  coins: number;
  skus: PortalShopSkuRow[];
  onPurchase: (skuId: string) => Promise<{ ok: boolean; error?: string }>;
  /** 购买结果走 3D 大厅底部 toast（羊皮纸主题） */
  onFeedback?: (message: string | null) => void;
};

function purchaseErrorText(error?: string): string {
  if (error === "insufficient_coins") return "金币不足";
  if (error === "weekly_limit_reached") return "本周购买已达上限";
  if (error === "sku_not_found") return "商品不存在";
  return "兑换失败，请稍后重试";
}

export function PortalShopPanel({ coins, skus, onPurchase, onFeedback }: PortalShopPanelProps) {
  const [buying, setBuying] = useState<string | null>(null);
  const [inlineNote, setInlineNote] = useState<string | null>(null);

  const handleBuy = useCallback(
    async (skuId: string, priceCoins: number) => {
      if (coins < priceCoins) {
        onFeedback?.("金币不足");
        return;
      }
      setBuying(skuId);
      setInlineNote(null);
      onFeedback?.(null);
      try {
        const r = await onPurchase(skuId);
        const message = r.ok ? "兑换成功！" : purchaseErrorText(r.error);
        if (onFeedback) {
          onFeedback(message);
        } else {
          setInlineNote(message);
        }
      } finally {
        setBuying(null);
      }
    },
    [coins, onPurchase, onFeedback]
  );

  return (
    <div className="portal-shop-panel">
      <p className="portal-shop-panel__balance">
        当前余额：<span>🪙 {coins.toLocaleString()}</span>
      </p>
      {inlineNote && !onFeedback ? (
        <p className="portal-shop-panel__note">{inlineNote}</p>
      ) : null}
      <ul className="portal-shop-panel__list">
        {skus.length === 0 ? (
          <li className="portal-shop-panel__empty">暂无商品，请稍后重试</li>
        ) : null}
        {skus.map((sku) => {
          const soldOut =
            sku.remainingThisWeek != null && sku.remainingThisWeek <= 0;
          const canAfford = coins >= sku.priceCoins;
          return (
            <li key={sku.skuId} className="portal-shop-panel__item">
              <div className="portal-shop-panel__itemMain">
                <strong>{sku.title}</strong>
                {sku.description ? (
                  <p className="portal-shop-panel__desc">{sku.description}</p>
                ) : null}
                {sku.grantReplayTokenCount > 0 ? (
                  <p className="portal-shop-panel__grant">
                    获得再战令 ×{sku.grantReplayTokenCount}
                  </p>
                ) : null}
                {sku.weeklyPurchaseLimit != null ? (
                  <p className="portal-shop-panel__limit">
                    本周剩余 {sku.remainingThisWeek ?? 0} / {sku.weeklyPurchaseLimit}
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
                disabled={buying != null || soldOut}
                onClick={() => void handleBuy(sku.skuId, sku.priceCoins)}
              >
                {buying === sku.skuId
                  ? "兑换中…"
                  : soldOut
                    ? "已售罄"
                    : `🪙 ${sku.priceCoins}`}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
