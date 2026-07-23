import React, { useEffect, useState } from "react";

import { PORTAL_SHOP_SKU_CATALOG } from "@/convex/portal/convex/data/portalShopCatalog";
import PartnerAdminShopPanel from "../../partner/admin/PartnerAdminShopPanel";
import { usePlatformAdminMutations } from "./usePlatformAdmin";

type ShopSettingsForm = {
  enabled: boolean;
  giftCardsEnabled: boolean;
  virtualEnabled: boolean;
  vouchersEnabled: boolean;
  adCoinEnabled: boolean;
  assortmentMode: "all_shared" | "allowlist";
  skuIds: string[];
  excludeSkuIds: string[];
  overrides: Record<string, unknown>;
};

type Props = {
  partnerId: number;
  canEdit: boolean;
};

const DEFAULT_FORM: ShopSettingsForm = {
  enabled: true,
  giftCardsEnabled: true,
  virtualEnabled: true,
  vouchersEnabled: true,
  adCoinEnabled: true,
  assortmentMode: "all_shared",
  skuIds: [],
  excludeSkuIds: [],
  overrides: {},
};

/**
 * Global partner shop settings (assortment / kind switches) + exclusive SKU CRUD.
 * Settings SoT lives in Portal; Platform Admin writes via SSO → Portal bridge.
 */
const PlatformPartnerShopPanel: React.FC<Props> = ({ partnerId, canEdit }) => {
  const { getPlatformPartnerShopSettings, savePlatformPartnerShopSettings } =
    usePlatformAdminMutations();
  const [form, setForm] = useState<ShopSettingsForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getPlatformPartnerShopSettings({ partnerId })
      .then((result) => {
        const settings = (result as { settings?: ShopSettingsForm }).settings;
        if (!cancelled && settings) {
          setForm({
            enabled: settings.enabled !== false,
            giftCardsEnabled: settings.giftCardsEnabled !== false,
            virtualEnabled: settings.virtualEnabled !== false,
            vouchersEnabled: settings.vouchersEnabled !== false,
            adCoinEnabled: settings.adCoinEnabled !== false,
            assortmentMode:
              settings.assortmentMode === "allowlist" ? "allowlist" : "all_shared",
            skuIds: settings.skuIds ?? [],
            excludeSkuIds: settings.excludeSkuIds ?? [],
            overrides: settings.overrides ?? {},
          });
        }
      })
      .catch(
        (error) =>
          !cancelled && setNote(error instanceof Error ? error.message : "加载失败")
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [getPlatformPartnerShopSettings, partnerId]);

  const toggleSku = (skuId: string) => {
    setForm((current) => ({
      ...current,
      skuIds: current.skuIds.includes(skuId)
        ? current.skuIds.filter((id) => id !== skuId)
        : [...current.skuIds, skuId],
    }));
  };

  const save = async () => {
    setSaving(true);
    setNote(null);
    try {
      await savePlatformPartnerShopSettings({ partnerId, ...form });
      setNote("商店设置已保存。");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return <p className="merchant-note">仅 platform admin / owner 可配置商店。</p>;
  }
  if (loading) {
    return <p className="merchant-note">加载商店设置…</p>;
  }

  return (
    <>
      <section className="merchant-admin-section">
        <h3 className="merchant-section-title">商店设置</h3>
        <p className="merchant-note">
          控制该 Partner Portal 商店的全局开关与共享 SKU 选品。无配置时默认「全部共享」。
        </p>
        <fieldset className="merchant-field merchant-field--radio">
          <legend>功能开关</legend>
          <label className="merchant-radio">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />
            商店启用
          </label>
          <label className="merchant-radio">
            <input
              type="checkbox"
              checked={form.giftCardsEnabled}
              onChange={(e) => setForm({ ...form, giftCardsEnabled: e.target.checked })}
            />
            礼品卡
          </label>
          <label className="merchant-radio">
            <input
              type="checkbox"
              checked={form.virtualEnabled}
              onChange={(e) => setForm({ ...form, virtualEnabled: e.target.checked })}
            />
            虚拟商品（门票等）
          </label>
          <label className="merchant-radio">
            <input
              type="checkbox"
              checked={form.vouchersEnabled}
              onChange={(e) => setForm({ ...form, vouchersEnabled: e.target.checked })}
            />
            兑换券 SKU
          </label>
          <label className="merchant-radio">
            <input
              type="checkbox"
              checked={form.adCoinEnabled}
              onChange={(e) => setForm({ ...form, adCoinEnabled: e.target.checked })}
            />
            看广告领金币
          </label>
        </fieldset>
        <p className="merchant-note merchant-note--compact">
          关闭「兑换券」只影响商店展示；玩家已获得的兑换券仍可核销。关闭「商店启用」也会关闭看广告领金币入口。
        </p>

        <fieldset className="merchant-field merchant-field--radio">
          <legend>选品模式</legend>
          <label className="merchant-radio">
            <input
              type="radio"
              name={`assortment-${partnerId}`}
              checked={form.assortmentMode === "all_shared"}
              onChange={() => setForm({ ...form, assortmentMode: "all_shared" })}
            />
            全部共享
          </label>
          <label className="merchant-radio">
            <input
              type="radio"
              name={`assortment-${partnerId}`}
              checked={form.assortmentMode === "allowlist"}
              onChange={() => setForm({ ...form, assortmentMode: "allowlist" })}
            />
            白名单
          </label>
        </fieldset>

        {form.assortmentMode === "allowlist" ? (
          <fieldset className="merchant-field merchant-field--radio">
            <legend>共享 SKU 选品</legend>
            {PORTAL_SHOP_SKU_CATALOG.map((sku) => (
              <label key={sku.skuId} className="merchant-radio">
                <input
                  type="checkbox"
                  checked={form.skuIds.includes(sku.skuId)}
                  onChange={() => toggleSku(sku.skuId)}
                />
                {sku.title} · {sku.priceCoins} 金币
              </label>
            ))}
          </fieldset>
        ) : null}

        <button
          type="button"
          className="merchant-btn"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "保存中…" : "保存商店设置"}
        </button>
        {note ? <p className="merchant-note">{note}</p> : null}
      </section>

      <section className="merchant-admin-section">
        <h3 className="merchant-section-title">Partner 专属商店 SKU</h3>
        <PartnerAdminShopPanel partnerId={partnerId} />
      </section>
    </>
  );
};

export default PlatformPartnerShopPanel;
