import React, { useEffect, useState } from "react";

import { PORTAL_SHOP_SKU_CATALOG } from "@/convex/portal/convex/data/portalShopCatalog";
import PartnerAdminShopPanel from "../../partner/admin/PartnerAdminShopPanel";
import {
  usePartnerPortalConfig,
  usePlatformAdminAuth,
  usePlatformAdminMutations,
} from "./usePlatformAdmin";

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

type LobbyOption = {
  lobbyId: string;
  slug: string;
  title: string;
  isDefault: boolean;
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

function formFromSettings(settings: Partial<ShopSettingsForm> | undefined): ShopSettingsForm {
  return {
    enabled: settings?.enabled !== false,
    giftCardsEnabled: settings?.giftCardsEnabled !== false,
    virtualEnabled: settings?.virtualEnabled !== false,
    vouchersEnabled: settings?.vouchersEnabled !== false,
    adCoinEnabled: settings?.adCoinEnabled !== false,
    assortmentMode:
      settings?.assortmentMode === "allowlist" ? "allowlist" : "all_shared",
    skuIds: settings?.skuIds ?? [],
    excludeSkuIds: settings?.excludeSkuIds ?? [],
    overrides: settings?.overrides ?? {},
  };
}

/**
 * Partner shop settings + optional lobby overlay when lobbyOpsMode=isolated.
 * Settings SoT lives in Portal; Platform Admin writes via SSO → Portal bridge.
 */
const PlatformPartnerShopPanel: React.FC<Props> = ({ partnerId, canEdit }) => {
  const { authed } = usePlatformAdminAuth();
  const { config: portalConfig } = usePartnerPortalConfig(partnerId);
  const {
    getPlatformPartnerShopSettings,
    savePlatformPartnerShopSettings,
    clearPlatformPartnerLobbyShopOverlay,
    listPlatformPartnerLobbies,
  } = usePlatformAdminMutations();
  const [form, setForm] = useState<ShopSettingsForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [lobbies, setLobbies] = useState<LobbyOption[]>([]);
  /** "" = partner base; otherwise lobbyId for overlay edit. */
  const [scopeLobbyId, setScopeLobbyId] = useState("");

  const isolated =
    portalConfig?.lobbyOpsModeEffective === "isolated" ||
    portalConfig?.lobbyOpsMode === "isolated";

  useEffect(() => {
    if (!authed || !isolated) {
      setLobbies([]);
      return;
    }
    let cancelled = false;
    void listPlatformPartnerLobbies({ partnerId })
      .then((result) => {
        const rows = (result as { lobbies?: LobbyOption[] }).lobbies ?? [];
        if (!cancelled) setLobbies(rows);
      })
      .catch(() => {
        if (!cancelled) setLobbies([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authed, isolated, listPlatformPartnerLobbies, partnerId]);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    setLoading(true);
    setNote(null);
    void getPlatformPartnerShopSettings({
      partnerId,
      ...(scopeLobbyId ? { lobbyId: scopeLobbyId } : {}),
    })
      .then((result) => {
        const settings = (result as { settings?: ShopSettingsForm }).settings;
        if (!cancelled) setForm(formFromSettings(settings));
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
  }, [authed, getPlatformPartnerShopSettings, partnerId, scopeLobbyId]);

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
      await savePlatformPartnerShopSettings({
        partnerId,
        ...(scopeLobbyId ? { lobbyId: scopeLobbyId } : {}),
        ...form,
        // Keep allowlist ids only when that mode is active.
        skuIds: form.assortmentMode === "allowlist" ? form.skuIds : [],
      });
      setNote(
        scopeLobbyId
          ? form.assortmentMode === "all_shared"
            ? "Lobby 商店覆盖已保存：该 Lobby 将展示全部共享商品（需同时开启虚拟商品/礼品卡开关）。"
            : "Lobby 商店覆盖已保存：白名单只影响共享 SKU。"
          : form.assortmentMode === "all_shared"
            ? "Partner 底配置已保存为全部共享；空白名单的 Lobby 覆盖已自动纠正。"
            : "Partner 商店底配置已保存。"
      );
    } catch (error) {
      setNote(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const clearLobbyOverlay = async () => {
    if (!scopeLobbyId) return;
    setSaving(true);
    setNote(null);
    try {
      const result = await clearPlatformPartnerLobbyShopOverlay({
        partnerId,
        lobbyId: scopeLobbyId,
      });
      const settings = (result as { settings?: ShopSettingsForm }).settings;
      setForm(formFromSettings(settings));
      setNote("已清除本 Lobby 商店覆盖，现继承 Partner 底配置。");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "清除失败");
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
          {isolated
            ? "当前 Partner 为经济隔离：玩家看到的货架 = 当前 Lobby 覆盖（若有），否则继承 Partner 底配置。请先把「Partner 底配置」设为全部共享并保存；若某 Lobby 曾存过空白名单覆盖，会挡住共享商品。"
            : "控制该 Partner Portal 商店的全局开关与共享 SKU 选品。无配置时默认「全部共享」。"}
        </p>

        {isolated ? (
          <label className="merchant-field">
            配置范围
            <select
              value={scopeLobbyId}
              onChange={(e) => setScopeLobbyId(e.target.value)}
            >
              <option value="">Partner 底配置（全 Lobby 默认）</option>
              {lobbies.map((lobby) => (
                <option key={lobby.lobbyId} value={lobby.lobbyId}>
                  {lobby.title} · {lobby.slug}
                  {lobby.isDefault ? " · default" : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}

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
          「全部共享」仍受上方开关约束：虚拟商品/礼品卡都关时，共享货架会是空的。
        </p>
        {form.assortmentMode === "all_shared" &&
        !form.virtualEnabled &&
        !form.giftCardsEnabled ? (
          <p className="merchant-note merchant-note--compact" role="alert">
            警告：全部共享已开，但虚拟商品与礼品卡都关闭——商店将没有共享商品。
          </p>
        ) : null}

        <fieldset className="merchant-field merchant-field--radio">
          <legend>选品模式</legend>
          <label className="merchant-radio">
            <input
              type="radio"
              name={`assortment-${partnerId}-${scopeLobbyId || "base"}`}
              checked={form.assortmentMode === "all_shared"}
              onChange={() => setForm({ ...form, assortmentMode: "all_shared" })}
            />
            全部共享
          </label>
          <label className="merchant-radio">
            <input
              type="radio"
              name={`assortment-${partnerId}-${scopeLobbyId || "base"}`}
              checked={form.assortmentMode === "allowlist"}
              onChange={() => setForm({ ...form, assortmentMode: "allowlist" })}
            />
            白名单
          </label>
        </fieldset>

        {form.assortmentMode === "allowlist" ? (
          <fieldset className="merchant-field merchant-field--radio">
            <legend>共享 SKU 选品</legend>
            <p className="merchant-note">
              白名单只约束上方共享目录；Partner 专属虚拟商品 / 兑换券由下方 CRUD 与对应开关控制，无需加入白名单。
            </p>
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

        <div className="merchant-field-row">
          <button
            type="button"
            className="merchant-btn"
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? "保存中…" : scopeLobbyId ? "保存 Lobby 商店覆盖" : "保存商店设置"}
          </button>
          {scopeLobbyId ? (
            <button
              type="button"
              className="merchant-btn merchant-btn--secondary"
              disabled={saving}
              onClick={() => void clearLobbyOverlay()}
            >
              清除 Lobby 覆盖（继承底配置）
            </button>
          ) : null}
        </div>
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
