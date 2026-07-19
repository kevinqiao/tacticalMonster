import React, { useEffect, useRef, useState } from "react";

import type { RegisteredPartnerGameType } from "@/convex/portal/convex/data/partnerGameRegistry";
import { isFirstPartyPartnerId } from "@/convex/sso/convex/service/auth/platformUid";
import { portalLaunchPath } from "@/host/util/portalPathParse";
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
  portal_key_required: "Portal key 必填（非第一方 Partner）。",
  portal_key_invalid: "Portal key 格式无效（小写字母、数字、连字符）。",
  portal_key_conflicts_game_type: "Portal key 不能与游戏类型同名。",
  portal_key_taken: "该 Portal key 已被占用。",
  portal_games_required: "请至少选择一款游戏。",
  portal_game_invalid: "存在未注册的游戏类型。",
  ad_replay_daily_cap_invalid: "每日广告再战次数须为 0–100 的整数（空=默认）。",
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

const PlatformPartnerPortalGamesPanel: React.FC<Props> = ({ partnerId, canEdit }) => {
  const config = usePartnerPortalConfig(partnerId);
  const { updatePartnerPortalConfig } = usePlatformAdminMutations();
  const [portalKey, setPortalKey] = useState("");
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  /** Empty string = use platform default (5). */
  const [adReplayDailyCapInput, setAdReplayDailyCapInput] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const hydratedForPartner = useRef<number | null>(null);

  // Prefer pid check over query flag so PID 0 never blocks on portal_key.
  const isFirstParty =
    isFirstPartyPartnerId(partnerId) || config?.isFirstParty === true;

  useEffect(() => {
    hydratedForPartner.current = null;
  }, [partnerId]);

  useEffect(() => {
    if (!config) return;
    if (hydratedForPartner.current === partnerId) return;
    hydratedForPartner.current = partnerId;
    setPortalKey(config.portalKey ?? "");
    const initialGames =
      config.games && config.games.length > 0
        ? config.games
        : [...(config.registryGames ?? [])];
    setSelectedGames(initialGames);
    setAdReplayDailyCapInput(
      typeof config.adReplayDailyCap === "number"
        ? String(config.adReplayDailyCap)
        : ""
    );
  }, [config, partnerId]);

  const toggleGame = (gameType: string) => {
    if (!canEdit) return;
    setSelectedGames((prev) =>
      prev.includes(gameType) ? prev.filter((g) => g !== gameType) : [...prev, gameType]
    );
  };

  const trimmedKey = portalKey.trim();

  const onSave = async () => {
    if (!canEdit) {
      setNote(portalConfigErrorMessage(new Error("forbidden")));
      return;
    }
    // Re-check by pid at save time (avoid stale closure / wrong flag).
    const saveAsFirstParty = isFirstPartyPartnerId(partnerId);
    if (!saveAsFirstParty && !trimmedKey) {
      setNote(portalConfigErrorMessage(new Error("portal_key_required")));
      return;
    }
    if (selectedGames.length === 0) {
      setNote(portalConfigErrorMessage(new Error("portal_games_required")));
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

    setSaving(true);
    setNote(null);
    try {
      await updatePartnerPortalConfig({
        partnerId,
        games: selectedGames,
        adReplayDailyCap,
        ...(saveAsFirstParty ? {} : { portalKey: trimmedKey }),
      });
      hydratedForPartner.current = null;
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

  const registryGames = config.registryGames ?? [];

  return (
    <>
      <p className="merchant-note">
        {isFirstParty ? (
          <>
            第一方（PID 0）使用路径 <code>/portal/&#123;game&#125;</code>，
            <strong>不需要</strong> portal_key。只需选择激活的游戏。
          </>
        ) : (
          <>
            平台授权：写入 <code>portal_key</code> + <code>games</code>，并启用{" "}
            <code>portal</code> context。路径：
            <code>/portal/&#123;key&#125;/&#123;game&#125;</code>。
          </>
        )}
      </p>
      {!isFirstParty ? (
        <label className="merchant-field">
          Portal key
          <input
            value={portalKey}
            onChange={(e) => setPortalKey(e.target.value)}
            placeholder="my-partner"
            autoComplete="off"
            disabled={!canEdit}
          />
        </label>
      ) : null}
      <fieldset className="merchant-field">
        <legend>激活游戏</legend>
        {registryGames.length === 0 ? (
          <p className="merchant-note">无注册游戏。</p>
        ) : (
          registryGames.map((gameType) => (
            <label key={gameType} style={{ display: "block", marginBottom: 6 }}>
              <input
                type="checkbox"
                checked={selectedGames.includes(gameType)}
                onChange={() => toggleGame(gameType)}
                disabled={!canEdit}
              />{" "}
              {gameType}
            </label>
          ))
        )}
      </fieldset>
      <label className="merchant-field">
        每日广告再战次数
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={adReplayDailyCapInput}
          onChange={(e) => setAdReplayDailyCapInput(e.target.value)}
          placeholder={`默认 ${config.adReplayDailyCapDefault ?? 5}`}
          autoComplete="off"
          disabled={!canEdit}
        />
      </label>
      <p className="merchant-note">
        留空使用默认 {config.adReplayDailyCapDefault ?? 5}；填 0 关闭广告再战。当前生效：
        {config.adReplayDailyCapEffective ?? config.adReplayDailyCapDefault ?? 5}。
      </p>
      {selectedGames.length > 0 ? (
        <ul className="merchant-note">
          {selectedGames.map((gameType) => (
            <li key={gameType}>
              <code>
                {isFirstParty
                  ? portalLaunchPath(null, gameType as RegisteredPartnerGameType)
                  : portalLaunchPath(
                      trimmedKey.toLowerCase(),
                      gameType as RegisteredPartnerGameType
                    )}
              </code>
            </li>
          ))}
        </ul>
      ) : (
        <p className="merchant-note">请至少选择一款游戏。</p>
      )}
      {canEdit ? (
        <button
          type="button"
          className="merchant-btn"
          disabled={saving}
          onClick={() => void onSave()}
        >
          {saving ? "保存中…" : "保存 Portal 授权"}
        </button>
      ) : (
        <p className="merchant-note">仅 owner / admin 可修改激活权。</p>
      )}
      {note ? <p className="merchant-note">{note}</p> : null}
    </>
  );
};

export default PlatformPartnerPortalGamesPanel;
