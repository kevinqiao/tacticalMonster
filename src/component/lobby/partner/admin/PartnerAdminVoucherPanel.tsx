import React, { useCallback, useEffect, useState } from "react";

import { partnerAdminErrorMessage } from "./partnerAdminHelpers";
import { usePartnerAdminAuth, usePartnerAdminMutations } from "./usePartnerAdmin";

export type PartnerVoucherSkuRow = {
  skuId: string;
  title: string;
  description: string;
  priceCoins: number;
  weeklyPurchaseLimit: number | null;
  sortOrder: number;
  active: boolean;
  voucherRewardText: string;
  voucherValidityDays: number | null;
  listInShop: boolean;
};

type Props = { partnerId: number };

const PartnerAdminVoucherPanel: React.FC<Props> = ({ partnerId }) => {
  const { authReady } = usePartnerAdminAuth();
  const { listPartnerShopSkus, upsertPartnerShopSku, setPartnerShopSkuActive, deletePartnerShopSku } =
    usePartnerAdminMutations();
  const [rows, setRows] = useState<PartnerVoucherSkuRow[]>([]);
  const [skuId, setSkuId] = useState("");
  const [title, setTitle] = useState("");
  const [priceCoins, setPriceCoins] = useState("0");
  const [rewardText, setRewardText] = useState("");
  const [listInShop, setListInShop] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!authReady) return;
    try {
      const result = await listPartnerShopSkus({ partnerId, kind: "voucher" });
      const skus = (result as { skus?: PartnerVoucherSkuRow[] }).skus;
      setRows(Array.isArray(skus) ? skus : []);
    } catch (error) {
      setNote(partnerAdminErrorMessage(error));
      setRows([]);
    }
  }, [authReady, listPartnerShopSkus, partnerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = async () => {
    const id = skuId.trim() || `partner_${partnerId}_voucher_${Date.now()}`;
    try {
      await upsertPartnerShopSku({
        partnerId,
        kind: "voucher",
        skuId: id,
        title,
        priceCoins: Number(priceCoins),
        voucherRewardText: rewardText,
        listInShop,
      });
      setSkuId("");
      setTitle("");
      setPriceCoins("0");
      setRewardText("");
      setListInShop(true);
      setNote("兑换券 SKU 已保存。");
      await refresh();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "保存失败");
    }
  };

  return (
    <section>
      <p className="merchant-note">配置兑换券 SKU；核销请求和输码操作在“核销”入口。</p>
      <div className="merchant-field-row">
        <label className="merchant-field">
          SKU ID（留空自动生成）
          <input value={skuId} onChange={(e) => setSkuId(e.target.value)} />
        </label>
        <label className="merchant-field">
          名称
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
      </div>
      <div className="merchant-field-row">
        <label className="merchant-field">
          价格（金币）
          <input
            type="number"
            min={0}
            value={priceCoins}
            onChange={(e) => setPriceCoins(e.target.value)}
          />
        </label>
        <label className="merchant-field">
          兑换说明
          <input value={rewardText} onChange={(e) => setRewardText(e.target.value)} />
        </label>
      </div>
      <label className="merchant-radio" style={{ marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={listInShop}
          onChange={(e) => setListInShop(e.target.checked)}
        />
        商店上架（关闭后仅可活动发放）
      </label>
      <button
        type="button"
        className="merchant-btn"
        disabled={!title.trim()}
        onClick={() => void save()}
      >
        保存兑换券 SKU
      </button>
      {note ? <p className="merchant-note">{note}</p> : null}
      {rows.length === 0 ? (
        <p className="merchant-note">暂无兑换券 SKU。</p>
      ) : (
        rows.map((row) => (
          <article key={row.skuId} className="merchant-card">
            <strong>{row.title}</strong>
            <p className="merchant-note">
              {row.priceCoins} 金币 · {row.listInShop ? "上架" : "仅活动"} ·{" "}
              {row.active ? "启用" : "停用"}
              {row.voucherRewardText ? ` · ${row.voucherRewardText}` : ""}
            </p>
            <div className="merchant-inline-actions">
              <button
                type="button"
                className="merchant-btn merchant-btn--compact"
                onClick={() =>
                  void setPartnerShopSkuActive({
                    partnerId,
                    skuId: row.skuId,
                    active: !row.active,
                  })
                    .then(refresh)
                    .catch((error) => setNote(partnerAdminErrorMessage(error)))
                }
              >
                {row.active ? "停用" : "启用"}
              </button>
              <button
                type="button"
                className="merchant-btn-secondary merchant-btn merchant-btn--compact"
                onClick={() =>
                  void deletePartnerShopSku({ partnerId, skuId: row.skuId })
                    .then(refresh)
                    .catch((error) => setNote(partnerAdminErrorMessage(error)))
                }
              >
                删除
              </button>
            </div>
          </article>
        ))
      )}
    </section>
  );
};

export default PartnerAdminVoucherPanel;
