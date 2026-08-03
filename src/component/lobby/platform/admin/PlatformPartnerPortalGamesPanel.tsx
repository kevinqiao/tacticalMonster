import React, { useEffect, useRef, useState } from "react";

import {
  calendarDateFromPortalWeekKey,
  portalWeekKeyFromCalendarDate,
} from "@/convex/portal/convex/data/portalSeasonHonorConfig";
import { isFirstPartyPartnerId } from "@/convex/sso/convex/service/auth/platformUid";
import { parseErrorCode } from "../../campaign/shared/campaignErrorMessage";

import {
  platformAdminErrorMessage,
  platformAdminSuccessMessage,
} from "./platformAdminHelpers";
import {
  usePartnerPortalConfig,
  usePlatformAdminMutations,
} from "./usePlatformAdmin";

const PORTAL_ERROR_MAP: Record<string, string> = {
  season_epoch_week_key_invalid:
    "赛季起点无效：请选择日期（将吸附到运营周周一）。",
  slug_required: "Partner slug 必填（非第一方 Partner）。",
  slug_invalid: "Partner slug 格式无效（小写字母、数字、连字符）。",
  slug_reserved: "该 Partner slug 为保留字。",
  /** @deprecated game-type slugs are allowed for partners now */
  slug_conflicts_game_type: "Partner slug 无效。",
  slug_taken: "该 Partner slug 已被占用。",
  /** @deprecated aliases */
  ad_replay_daily_cap_invalid: "每日广告再战次数须为 0–100 的整数（空=默认无限）。",
  max_replays_per_match_invalid: "同局最多再战次数须为 0–20 的整数（空=默认 1）。",
  ticket_replay_price_invalid: "门票再战价格须为 1–100 的整数（空=默认 1）。",
  play_entry_setting_invalid:
    "入场共享范围须为 mode/lobby/tournament；免费/广告次数须为 0–100；门票价格须为 1–100，次数须为 0–100。",
  forbidden: "需要 platform_staff admin（或 owner）权限。",
  unauthenticated: "请重新登录后再试。",
  not_found: "找不到该 Partner。",
};

function portalConfigErrorMessage(error: unknown): string {
  const code = parseErrorCode(error);
  return PORTAL_ERROR_MAP[code] ?? platformAdminErrorMessage(error);
}

type Props = {
  partnerId: number;
  canEdit: boolean;
};

/** Partner base settings: slug + entry ladder + replay (games come from Lobbies). */
const PlatformPartnerPortalGamesPanel: React.FC<Props> = ({ partnerId, canEdit }) => {
  const { config, reload } = usePartnerPortalConfig(partnerId);
  const { updatePartnerPortalConfig, updatePartnerCapabilities } =
    usePlatformAdminMutations();
  const [portalGamesCap, setPortalGamesCap] = useState(false);
  const [campaignOpsCap, setCampaignOpsCap] = useState(false);
  const [savingCaps, setSavingCaps] = useState(false);
  const [partnerSlug, setPartnerSlug] = useState("");
  /** Empty string = use platform default (unlimited). */
  const [adReplayDailyCapInput, setAdReplayDailyCapInput] = useState("");
  /** Empty string = use default 1. */
  const [maxReplaysPerMatchInput, setMaxReplaysPerMatchInput] = useState("");
  const [adReplayEnabled, setAdReplayEnabled] = useState(true);
  const [ticketReplayEnabled, setTicketReplayEnabled] = useState(true);
  const [ticketReplayPriceInput, setTicketReplayPriceInput] = useState("");
  const [freeSolo, setFreeSolo] = useState("");
  const [freeMulti, setFreeMulti] = useState("");
  /** mode | lobby | tournament — default mode when unset. */
  const [quotaScope, setQuotaScope] = useState<"mode" | "lobby" | "tournament">(
    "mode"
  );
  /** isolated | shared — economy partition across lobbies. */
  const [lobbyOpsMode, setLobbyOpsMode] = useState<"isolated" | "shared">(
    "shared"
  );
  /** Partner 赛季日历 epoch；空=全站缺省 */
  const [seasonEpochWeekKey, setSeasonEpochWeekKey] = useState("");
  const [adEntryEnabled, setAdEntryEnabled] = useState(true);
  const [adEntrySoloCap, setAdEntrySoloCap] = useState("");
  const [adEntryMultiCap, setAdEntryMultiCap] = useState("");
  const [ticketEntryEnabled, setTicketEntryEnabled] = useState(true);
  const [ticketSoloPrice, setTicketSoloPrice] = useState("");
  const [ticketSoloCap, setTicketSoloCap] = useState("");
  const [ticketMultiPrice, setTicketMultiPrice] = useState("");
  const [ticketMultiCap, setTicketMultiCap] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hydratedForPartner = useRef<number | null>(null);
  const lastHydratedCapKey = useRef<string>("");

  const isFirstParty =
    isFirstPartyPartnerId(partnerId) || config?.isFirstParty === true;

  useEffect(() => {
    hydratedForPartner.current = null;
    lastHydratedCapKey.current = "";
  }, [partnerId]);

  // Re-hydrate when server cap changes (e.g. after save), not only on first open.
  const serverCapKey =
    config == null
      ? ""
      : `${partnerId}:${String(config.adReplayDailyCap ?? "")}:${String(config.maxReplaysPerMatch ?? "")}:${String(config.ticketReplayPriceTickets ?? "")}`;

  useEffect(() => {
    if (!config) return;
    if (hydratedForPartner.current === partnerId && lastHydratedCapKey.current === serverCapKey) {
      return;
    }
    hydratedForPartner.current = partnerId;
    lastHydratedCapKey.current = serverCapKey;
    setPortalGamesCap(config.capabilities?.portalGames === true);
    setCampaignOpsCap(config.capabilities?.campaignOps === true);
    setPartnerSlug(config.partnerSlug ?? "");
    setAdReplayDailyCapInput(
      typeof config.adReplayDailyCap === "number"
        ? String(config.adReplayDailyCap)
        : ""
    );
    setMaxReplaysPerMatchInput(
      typeof config.maxReplaysPerMatch === "number"
        ? String(config.maxReplaysPerMatch)
        : ""
    );
    setAdReplayEnabled(config.adReplayEnabled !== false);
    setTicketReplayEnabled(config.ticketReplayEnabled !== false);
    setTicketReplayPriceInput(
      typeof config.ticketReplayPriceTickets === "number"
        ? String(config.ticketReplayPriceTickets)
        : ""
    );
    setFreeSolo(config.freePlaySoloDailyCap == null ? "" : String(config.freePlaySoloDailyCap));
    setFreeMulti(config.freePlayMultiDailyCap == null ? "" : String(config.freePlayMultiDailyCap));
    setQuotaScope(
      config.quotaScope === "lobby" || config.quotaScope === "tournament"
        ? config.quotaScope
        : "mode"
    );
    setLobbyOpsMode(
      config.lobbyOpsModeEffective === "isolated" ||
        config.lobbyOpsMode === "isolated"
        ? "isolated"
        : "shared"
    );
    setSeasonEpochWeekKey(config.seasonEpochWeekKey ?? "");
    setAdEntryEnabled(config.adEntryEnabled !== false);
    setAdEntrySoloCap(
      config.adEntrySoloDailyCap == null ? "" : String(config.adEntrySoloDailyCap)
    );
    setAdEntryMultiCap(
      config.adEntryMultiDailyCap == null ? "" : String(config.adEntryMultiDailyCap)
    );
    setTicketEntryEnabled(config.ticketEntryEnabled !== false);
    setTicketSoloPrice(config.ticketEntrySoloPriceTickets == null ? "" : String(config.ticketEntrySoloPriceTickets));
    setTicketSoloCap(config.ticketEntrySoloDailyCap == null ? "" : String(config.ticketEntrySoloDailyCap));
    setTicketMultiPrice(config.ticketEntryMultiPriceTickets == null ? "" : String(config.ticketEntryMultiPriceTickets));
    setTicketMultiCap(config.ticketEntryMultiDailyCap == null ? "" : String(config.ticketEntryMultiDailyCap));
  }, [config, partnerId, serverCapKey]);

  const trimmedSlug = partnerSlug.trim();

  const onSaveCapabilities = async () => {
    if (!canEdit) return;
    setSavingCaps(true);
    setNote(null);
    try {
      const trimmedSlug = partnerSlug.trim().toLowerCase();
      await updatePartnerCapabilities({
        partnerId,
        portalGames: portalGamesCap,
        campaignOps: campaignOpsCap,
        ...(campaignOpsCap && trimmedSlug ? { slug: trimmedSlug } : {}),
      });
      hydratedForPartner.current = null;
      reload();
      setNote(platformAdminSuccessMessage("capabilitiesSaved"));
    } catch (e) {
      setNote(portalConfigErrorMessage(e));
    } finally {
      setSavingCaps(false);
    }
  };

  const onSave = async () => {
    if (!canEdit) {
      setNote(portalConfigErrorMessage(new Error("forbidden")));
      return;
    }
    // Non–first-party must have a slug; Default Partner slug is optional.
    const saveAsFirstParty = isFirstPartyPartnerId(partnerId);
    if (!saveAsFirstParty && !trimmedSlug) {
      setNote(portalConfigErrorMessage(new Error("slug_required")));
      return;
    }
    const capTrimmed = adReplayDailyCapInput.trim();
    let adReplayDailyCap: number | null;
    if (capTrimmed === "") {
      adReplayDailyCap = null;
    } else {
      const n = Number(capTrimmed);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 100) {
        setNote(portalConfigErrorMessage(new Error("ad_replay_daily_cap_invalid")));
        return;
      }
      adReplayDailyCap = n;
    }
    const maxTrimmed = maxReplaysPerMatchInput.trim();
    let maxReplaysPerMatch: number | null;
    if (maxTrimmed === "") {
      maxReplaysPerMatch = null;
    } else {
      const n = Number(maxTrimmed);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 20) {
        setNote(portalConfigErrorMessage(new Error("max_replays_per_match_invalid")));
        return;
      }
      maxReplaysPerMatch = n;
    }
    const ticketPriceTrimmed = ticketReplayPriceInput.trim();
    let ticketReplayPriceTickets: number | null;
    if (ticketPriceTrimmed === "") {
      ticketReplayPriceTickets = null;
    } else {
      const n = Number(ticketPriceTrimmed);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 100) {
        setNote(portalConfigErrorMessage(new Error("ticket_replay_price_invalid")));
        return;
      }
      ticketReplayPriceTickets = n;
    }

    setSaving(true);
    setNote(null);
    try {
      await updatePartnerPortalConfig({
        partnerId,
        adReplayDailyCap,
        maxReplaysPerMatch,
        adReplayEnabled,
        ticketReplayEnabled,
        ticketReplayPriceTickets,
        freePlaySoloDailyCap: freeSolo === "" ? null : Number(freeSolo),
        freePlayMultiDailyCap: freeMulti === "" ? null : Number(freeMulti),
        quotaScope,
        lobbyOpsMode,
        seasonEpochWeekKey:
          seasonEpochWeekKey.trim() === "" ? null : seasonEpochWeekKey.trim(),
        adEntryEnabled,
        adEntrySoloDailyCap: adEntrySoloCap === "" ? null : Number(adEntrySoloCap),
        adEntryMultiDailyCap: adEntryMultiCap === "" ? null : Number(adEntryMultiCap),
        ticketEntryEnabled,
        ticketEntrySoloPriceTickets: ticketSoloPrice === "" ? null : Number(ticketSoloPrice),
        ticketEntrySoloDailyCap: ticketSoloCap === "" ? null : Number(ticketSoloCap),
        ticketEntryMultiPriceTickets: ticketMultiPrice === "" ? null : Number(ticketMultiPrice),
        ticketEntryMultiDailyCap: ticketMultiCap === "" ? null : Number(ticketMultiCap),
        // Always send: first-party empty string clears vanity slug.
        partnerSlug: trimmedSlug,
      });
      hydratedForPartner.current = null;
      reload();
      setNote(platformAdminSuccessMessage("portalSaved"));
    } catch (e) {
      setNote(portalConfigErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (config === undefined) {
    return <p className="merchant-note">加载中…</p>;
  }
  if (config === null) {
    return <p className="merchant-note">找不到 Partner 或无权限。</p>;
  }

  const derivedGames = config.games ?? [];

  return (
    <section style={{ marginBottom: 28 }}>
      <h3 className="merchant-section-title">Partner 基础设置</h3>
      <fieldset className="merchant-field merchant-field--radio">
        <legend>产品能力</legend>
        <p className="merchant-note" style={{ marginTop: 0 }}>
          平台级开关：控制该 Partner 是否启用 Game Center（portal）与 Campaign Ops。
        </p>
        <label className="merchant-radio">
          <input
            type="checkbox"
            checked={portalGamesCap}
            disabled={!canEdit}
            onChange={(e) => setPortalGamesCap(e.target.checked)}
          />
          portalGames（Game Center / Portal）
        </label>
        <label className="merchant-radio">
          <input
            type="checkbox"
            checked={campaignOpsCap}
            disabled={!canEdit}
            onChange={(e) => setCampaignOpsCap(e.target.checked)}
          />
          campaignOps（活动；门店在团队）
        </label>
        {campaignOpsCap && !partnerSlug.trim() && !isFirstParty ? (
          <p className="merchant-note">开启 campaignOps 时需填写下方 Partner slug。</p>
        ) : null}
        {canEdit ? (
          <button
            type="button"
            className="merchant-btn"
            style={{ marginTop: 8 }}
            disabled={savingCaps}
            onClick={() => void onSaveCapabilities()}
          >
            {savingCaps ? "保存中…" : "保存产品能力"}
          </button>
        ) : null}
      </fieldset>
      <p className="merchant-note">
        {isFirstParty ? (
          <>
            第一方（PID 0）入口为 <code>/gc</code>。可选 Partner slug（如 <code>main</code>
            ）启用 <code>/gc/&#123;slug&#125;/...</code>。大厅上架由 Game Lobby offerings / tournament 决定。
          </>
        ) : (
          <>
            Partner 级底配置：slug、入场阶梯与再战。大厅上架游戏由 Game Lobby offerings /
            tournament 决定（与 partner 级 games 无关）。
          </>
        )}
      </p>
      <label className="merchant-field">
        Partner slug{isFirstParty ? "（可选）" : ""}
        <input
          value={partnerSlug}
          onChange={(e) => setPartnerSlug(e.target.value)}
          placeholder={isFirstParty ? "main" : "my-partner"}
          autoComplete="off"
          disabled={!canEdit}
        />
      </label>
      {typeof config.lobbyUrl === "string" && config.lobbyUrl ? (
        <p className="merchant-note">
          默认 Lobby URL：<code>{config.lobbyUrl}</code>
        </p>
      ) : null}
      {derivedGames.length > 0 ? (
        <p className="merchant-note">
          当前派生游戏：{" "}
          {derivedGames.map((g, i) => (
            <React.Fragment key={g}>
              {i > 0 ? " · " : null}
              <code>{g}</code>
            </React.Fragment>
          ))}
        </p>
      ) : (
        <p className="merchant-note">尚未从 Lobby 派生游戏 — 请先在 Game Lobby 配置 offerings。</p>
      )}
      <fieldset className="merchant-field merchant-field--radio">
        <legend>再战设置</legend>
        <label className="merchant-field">
          同局最多再战次数
          <input
            type="number"
            min={0}
            max={20}
            step={1}
            value={maxReplaysPerMatchInput}
            onChange={(e) => setMaxReplaysPerMatchInput(e.target.value)}
            placeholder={`默认 ${config.maxReplaysPerMatchDefault ?? 1}`}
            autoComplete="off"
            disabled={!canEdit}
          />
        </label>
        <p className="merchant-note">
          留空默认 {config.maxReplaysPerMatchDefault ?? 1}；填 0 关闭再战。当前生效：
          {config.maxReplaysPerMatchEffective ?? config.maxReplaysPerMatchDefault ?? 1}。
        </p>
        <label className="merchant-radio">
          <input
            type="checkbox"
            checked={adReplayEnabled}
            onChange={(e) => setAdReplayEnabled(e.target.checked)}
            disabled={!canEdit}
          />
          广告再战
        </label>
        <label className="merchant-field">
          每日广告再战次数
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={adReplayDailyCapInput}
            onChange={(e) => setAdReplayDailyCapInput(e.target.value)}
            placeholder="默认无限"
            autoComplete="off"
            disabled={!canEdit || !adReplayEnabled}
          />
        </label>
        <p className="merchant-note">
          留空使用默认无限；填 0 关闭广告日限档；填 1–100 设有限日限。当前生效：
          {typeof config.adReplayDailyCapEffective === "number" &&
          config.adReplayDailyCapEffective > 100
            ? "无限"
            : (config.adReplayDailyCapEffective ?? "无限")}
          。
        </p>
        <label className="merchant-radio">
          <input
            type="checkbox"
            checked={ticketReplayEnabled}
            onChange={(e) => setTicketReplayEnabled(e.target.checked)}
            disabled={!canEdit}
          />
          门票再战
        </label>
        <label className="merchant-field">
          门票再战价格
          <input
            type="number"
            min={1}
            max={100}
            step={1}
            value={ticketReplayPriceInput}
            onChange={(e) => setTicketReplayPriceInput(e.target.value)}
            placeholder="默认 1"
            autoComplete="off"
            disabled={!canEdit || !ticketReplayEnabled}
          />
        </label>
      </fieldset>
      <fieldset className="merchant-field merchant-field--radio">
        <legend>Lobby 经济隔离</legend>
        <label className="merchant-field">
          运营模式
          <select
            value={lobbyOpsMode}
            onChange={(e) =>
              setLobbyOpsMode(e.target.value as "isolated" | "shared")
            }
            disabled={!canEdit}
          >
            <option value="isolated">隔离 — 钱包/商店/广告再战额度按 Lobby 分开</option>
            <option value="shared">共享 — 同 Partner 下各 Lobby 共用经济</option>
          </select>
        </label>
        <p className="merchant-note">
          仅影响经济与广告用量。匹配池与种子履历始终按玩家身份（uid）在 Partner 内共享。
          切换隔离时 shared 余额不会自动拆分；切回共享时需运维合并各 Lobby 钱包。
        </p>
      </fieldset>
      <fieldset className="merchant-field merchant-field--radio">
        <legend>赛季日历（Partner 共用）</legend>
        <label className="merchant-field">
          赛季起点（运营周）
          <input
            type="date"
            value={
              seasonEpochWeekKey
                ? calendarDateFromPortalWeekKey(seasonEpochWeekKey)
                : ""
            }
            onChange={(e) => {
              const ymd = e.target.value;
              if (!ymd) {
                setSeasonEpochWeekKey("");
                return;
              }
              const weekKey = portalWeekKeyFromCalendarDate(ymd);
              if (weekKey) setSeasonEpochWeekKey(weekKey);
            }}
            disabled={!canEdit}
          />
        </label>
        <p className="merchant-note">
          任选一天会吸附到该运营周周一（Asia/Shanghai，与周联赛同周窗）。
          {seasonEpochWeekKey ? (
            <>
              {" "}
              已选：<code>{seasonEpochWeekKey}</code>
              {canEdit ? (
                <>
                  {" · "}
                  <button
                    type="button"
                    className="merchant-btn"
                    style={{ padding: "2px 8px", fontSize: 12 }}
                    onClick={() => setSeasonEpochWeekKey("")}
                  >
                    清除（用全站缺省）
                  </button>
                </>
              ) : null}
            </>
          ) : (
            <>
              {" "}
              未覆盖；生效：
              {config.seasonEpochWeekKeyEffective ?? "全站缺省"}
            </>
          )}
        </p>
        <p className="merchant-note">
          该 Partner 下所有 Lobby 共用一本赛季日历（5 周一季）。晚开 Lobby 默认中途加入当前季；
          也可在 Lobby 设置里选「等下一季再开」。
        </p>
      </fieldset>
      <fieldset className="merchant-field merchant-field--radio">
        <legend>免费 → 广告 → 门票入场（Partner 底配置）</legend>
        <label className="merchant-field">
          入场次数共享范围
          <select
            value={quotaScope}
            onChange={(e) =>
              setQuotaScope(e.target.value as "mode" | "lobby" | "tournament")
            }
            disabled={!canEdit}
          >
            <option value="mode">按模式（单人/多人各一池，跨游戏共享）</option>
            <option value="lobby">整个 Lobby（所有模式与赛事共用一池）</option>
            <option value="tournament">每个赛事独立</option>
          </select>
        </label>
        <p className="merchant-note">
          Lobby 可再覆盖此底配置。默认「按模式」：Solitaire / Block Blast 共用单人免费次数。
          留空=平台默认（单人 3 / 多人 10）；保存后会同步到 Portal，否则大厅仍用代码默认值。
        </p>
        <div className="merchant-field-row">
          <label className="merchant-field">
            单人免费/日
            <input
              type="number"
              min={0}
              max={100}
              value={freeSolo}
              onChange={(e) => setFreeSolo(e.target.value)}
              placeholder="默认 3"
              disabled={!canEdit}
            />
          </label>
          <label className="merchant-field">
            多人免费/日
            <input
              type="number"
              min={0}
              max={100}
              value={freeMulti}
              onChange={(e) => setFreeMulti(e.target.value)}
              placeholder="默认 10"
              disabled={!canEdit}
            />
          </label>
        </div>
        <label className="merchant-radio">
          <input
            type="checkbox"
            checked={adEntryEnabled}
            onChange={(e) => setAdEntryEnabled(e.target.checked)}
            disabled={!canEdit}
          />
          广告入场
        </label>
        <p className="merchant-note">
          免费用尽后可看广告进入；填 0 关闭该模式广告入场日限档。留空=平台默认（单人 5 /
          多人 10），保存后会同步清除 Portal 旧覆盖值。
        </p>
        <div className="merchant-field-row">
          <label className="merchant-field">
            单人广告入场/日
            <input
              type="number"
              min={0}
              max={100}
              value={adEntrySoloCap}
              onChange={(e) => setAdEntrySoloCap(e.target.value)}
              placeholder="默认 5"
              disabled={!canEdit || !adEntryEnabled}
            />
          </label>
          <label className="merchant-field">
            多人广告入场/日
            <input
              type="number"
              min={0}
              max={100}
              value={adEntryMultiCap}
              onChange={(e) => setAdEntryMultiCap(e.target.value)}
              placeholder="默认 10"
              disabled={!canEdit || !adEntryEnabled}
            />
          </label>
        </div>
        <label className="merchant-radio">
          <input
            type="checkbox"
            checked={ticketEntryEnabled}
            onChange={(e) => setTicketEntryEnabled(e.target.checked)}
            disabled={!canEdit}
          />
          门票入场
        </label>
        <p className="merchant-note">广告入场用尽后可用门票进入；填 0 关闭该模式门票入场日限档。</p>
        <div className="merchant-field-row">
          <label className="merchant-field">
            单人门票价格
            <input
              type="number"
              min={1}
              max={100}
              value={ticketSoloPrice}
              onChange={(e) => setTicketSoloPrice(e.target.value)}
              placeholder="默认 1"
              disabled={!canEdit || !ticketEntryEnabled}
            />
          </label>
          <label className="merchant-field">
            单人门票次数/日
            <input
              type="number"
              min={0}
              max={100}
              value={ticketSoloCap}
              onChange={(e) => setTicketSoloCap(e.target.value)}
              placeholder="默认 3"
              disabled={!canEdit || !ticketEntryEnabled}
            />
          </label>
        </div>
        <div className="merchant-field-row">
          <label className="merchant-field">
            多人门票价格
            <input
              type="number"
              min={1}
              max={100}
              value={ticketMultiPrice}
              onChange={(e) => setTicketMultiPrice(e.target.value)}
              placeholder="默认 2"
              disabled={!canEdit || !ticketEntryEnabled}
            />
          </label>
          <label className="merchant-field">
            多人门票次数/日
            <input
              type="number"
              min={0}
              max={100}
              value={ticketMultiCap}
              onChange={(e) => setTicketMultiCap(e.target.value)}
              placeholder="默认 5"
              disabled={!canEdit || !ticketEntryEnabled}
            />
          </label>
        </div>
      </fieldset>
      {canEdit ? (
        <button
          type="button"
          className="merchant-btn"
          disabled={saving}
          onClick={() => void onSave()}
        >
          {saving ? "保存中…" : "保存基础设置"}
        </button>
      ) : (
        <p className="merchant-note">仅 owner / admin 可修改基础设置。</p>
      )}
      {note ? <p className="merchant-note">{note}</p> : null}
    </section>
  );
};

export default PlatformPartnerPortalGamesPanel;
