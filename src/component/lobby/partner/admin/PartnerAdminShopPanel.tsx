import React, { useCallback, useEffect, useState } from "react";

import PartnerAdminVoucherPanel from "./PartnerAdminVoucherPanel";
import { usePartnerAdminMutations } from "./usePartnerAdmin";

type VirtualSku = {
  skuId: string;
  title: string;
  priceCoins: number;
  grantReplayTokenCount: number;
  active: boolean;
};

type Props = { partnerId: number };

const PartnerAdminShopPanel: React.FC<Props> = ({ partnerId }) => {
  const { listPartnerShopSkus, upsertPartnerShopSku, setPartnerShopSkuActive, deletePartnerShopSku } =
    usePartnerAdminMutations();
  const [rows, setRows] = useState<VirtualSku[]>([]);
  const [title, setTitle] = useState("");
  const [priceCoins, setPriceCoins] = useState("0");
  const [tokens, setTokens] = useState("1");
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await listPartnerShopSkus({ partnerId, kind: "virtual" });
    setRows(
      Array.isArray((result as { skus?: VirtualSku[] }).skus)
        ? (result as { skus: VirtualSku[] }).skus
        : []
    );
  }, [listPartnerShopSkus, partnerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveVirtual = async () => {
    try {
      await upsertPartnerShopSku({
        partnerId,
        kind: "virtual",
        skuId: `partner_${partnerId}_virtual_${Date.now()}`,
        title,
        priceCoins: Number(priceCoins),
        grantReplayTokenCount: Number(tokens),
      });
      setTitle("");
      setPriceCoins("0");
      setTokens("1");
      setNote("虚拟商品 SKU 已保存。");
      await refresh();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "保存失败");
    }
  };

  return (
    <section>
      <h3 className="merchant-section-title" style={{ marginTop: 0 }}>
        虚拟商品
      </h3>
      <p className="merchant-note">Partner 专属 SKU 只会在该 Partner 的 Portal 商店中解析。</p>
      <div className="merchant-field-row">
        <label className="merchant-field">
          名称
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="merchant-field">
          价格（金币）
          <input
            type="number"
            min={0}
            value={priceCoins}
            onChange={(e) => setPriceCoins(e.target.value)}
          />
        </label>
      </div>
      <label className="merchant-field">
        发放门票
        <input
          type="number"
          min={0}
          value={tokens}
          onChange={(e) => setTokens(e.target.value)}
        />
      </label>
      <button
        type="button"
        className="merchant-btn"
        disabled={!title.trim()}
        onClick={() => void saveVirtual()}
      >
        新增虚拟 SKU
      </button>
      {note ? <p className="merchant-note">{note}</p> : null}
      {rows.length === 0 ? (
        <p className="merchant-note">暂无虚拟 SKU。</p>
      ) : (
        rows.map((row) => (
          <article key={row.skuId} className="merchant-card">
            <strong>{row.title}</strong>
            <p className="merchant-note">
              {row.priceCoins} 金币 · 门票 {row.grantReplayTokenCount} ·{" "}
              {row.active ? "启用" : "停用"}
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
                  }).then(refresh)
                }
              >
                {row.active ? "停用" : "启用"}
              </button>
              <button
                type="button"
                className="merchant-btn-secondary merchant-btn merchant-btn--compact"
                onClick={() =>
                  void deletePartnerShopSku({ partnerId, skuId: row.skuId }).then(refresh)
                }
              >
                删除
              </button>
            </div>
          </article>
        ))
      )}

      <h3 className="merchant-section-title">兑换券</h3>
      <PartnerAdminVoucherPanel partnerId={partnerId} />
    </section>
  );
};

export default PartnerAdminShopPanel;
