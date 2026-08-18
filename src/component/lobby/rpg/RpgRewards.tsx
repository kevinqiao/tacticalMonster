import React, { useState } from "react";
import { RPG_PASS_NODES } from "convex/portal/convex/data/passTrack";
import { claimRpgPass, getRpgHud } from "./rpgRuntime";

const RpgRewards: React.FC = () => {
  const hud = getRpgHud();
  const [message, setMessage] = useState("");
  const next = RPG_PASS_NODES.find((node) => !hud.claimed.includes(node.node));
  return (
    <div>
      <div className="rpg-title">任期奖励 · 节点 {hud.claimed.length}</div>
      <p className="rpg-note">
        XP {hud.passXp} · 下一档 {next ? `${next.kind} x${next.amount}` : "已满"}
      </p>
      <p className="rpg-note">秀斗 +10 XP / 试炼成功 +4。领取不是拆包。</p>
      <button
        className="rpg-cta"
        onClick={() => {
          const result = claimRpgPass();
          setMessage(result.claimed.length ? `领取 ${result.claimed.length} 档` : "没有可领节点");
        }}
      >
        领取
      </button>
      {message && <p className="rpg-note">{message}</p>}
    </div>
  );
};

export default RpgRewards;
