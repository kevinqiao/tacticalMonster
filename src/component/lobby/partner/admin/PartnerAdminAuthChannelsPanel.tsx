import React, { useEffect, useState } from "react";

import type {
  PlayerAuthMode,
  StaffAuthMode,
} from "@/convex/sso/convex/service/auth/partnerAuth";
import { EMBED_AUTH_METHODS } from "@/convex/sso/convex/service/embed/embedAuthConstants";

import { partnerAdminErrorMessage, partnerAdminSuccessMessage } from "./partnerAdminHelpers";
import { usePartnerAdminMutations, usePartnerDetail } from "./usePartnerAdmin";

type PartnerAdminAuthChannelsPanelProps = {
  partnerId: number;
};

const PLAYER_MODE_OPTIONS: Array<{ value: PlayerAuthMode; label: string }> = [
  { value: "clerk", label: "平台账号（Clerk）— Partner 无用户系统时用这个" },
  { value: "embed", label: "宿主 / Embed — 仅 Partner 发身份" },
  {
    value: "embed_then_clerk",
    label: "Embed 优先，失败后可用平台账号",
  },
];

const PartnerAdminAuthChannelsPanel: React.FC<PartnerAdminAuthChannelsPanelProps> = ({
  partnerId,
}) => {
  const detail = usePartnerDetail(partnerId);
  const { updatePartnerPlayerAuth, updatePartnerStaffAuth } = usePartnerAdminMutations();
  const [playerMode, setPlayerMode] = useState<PlayerAuthMode>("clerk");
  const [embedMethod, setEmbedMethod] =
    useState<(typeof EMBED_AUTH_METHODS)[number]>("jwt_local");
  const [staffMode, setStaffMode] = useState<StaffAuthMode | "off">("web");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!detail) return;
    const pa = detail.playerAuth;
    setPlayerMode(pa?.mode ?? "clerk");
    setEmbedMethod(pa?.embed?.method ?? "jwt_local");
    setStaffMode(detail.staffAuth?.mode === "web" ? "web" : "web");
  }, [detail]);

  const onSave = async () => {
    try {
      const playerAuth =
        playerMode === "clerk"
          ? { mode: "clerk" as const }
          : {
              mode: playerMode,
              embed: { method: embedMethod },
            };
      await updatePartnerPlayerAuth({ partnerId, playerAuth });
      if (staffMode === "web") {
        await updatePartnerStaffAuth({ partnerId, staffAuth: { mode: "web" } });
      }
      setNote(partnerAdminSuccessMessage("authChannelsSaved"));
    } catch (e) {
      setNote(partnerAdminErrorMessage(e));
    }
  };

  if (detail === undefined) {
    return <p className="merchant-note">加载中…</p>;
  }
  if (detail === null) {
    return <p className="merchant-note">Partner not found or access denied.</p>;
  }

  const needsEmbed = playerMode === "embed" || playerMode === "embed_then_clerk";

  return (
    <>
      <p className="merchant-note">
        <code>playerAuth</code>：玩家登录 SoT。
        <code>staffAuth</code>：管理后台登录。
      </p>

      <fieldset className="merchant-field">
        <legend>玩家登录（playerAuth）</legend>
        {PLAYER_MODE_OPTIONS.map((opt) => (
          <label key={opt.value} style={{ display: "block", marginBottom: 6 }}>
            <input
              type="radio"
              name="playerAuthMode"
              checked={playerMode === opt.value}
              onChange={() => setPlayerMode(opt.value)}
            />{" "}
            {opt.label}
          </label>
        ))}
      </fieldset>

      {needsEmbed ? (
        <label className="merchant-field">
          Embed 验法（playerAuth.embed.method）
          <select
            value={embedMethod}
            onChange={(e) =>
              setEmbedMethod(e.target.value as (typeof EMBED_AUTH_METHODS)[number])
            }
          >
            {EMBED_AUTH_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <fieldset className="merchant-field">
        <legend>管理后台（staffAuth）</legend>
        <label style={{ display: "block", marginBottom: 6 }}>
          <input
            type="radio"
            name="staffAuthMode"
            checked={staffMode === "web"}
            onChange={() => setStaffMode("web")}
          />{" "}
          Web 账号密码
        </label>
      </fieldset>

      <button type="button" className="merchant-btn" onClick={() => void onSave()}>
        保存登录配置
      </button>
      {note ? <p className="merchant-note">{note}</p> : null}
    </>
  );
};

export default PartnerAdminAuthChannelsPanel;
