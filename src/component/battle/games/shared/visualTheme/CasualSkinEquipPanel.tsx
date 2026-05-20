import { useCasualPlatform } from "component/lobby/casual/service/useCasualPlatformManager";
import React, { useState } from "react";

import "./casualSkinEquipPanel.css";

/** Play Hub / 通行证旁：装备玩法外观（最小 UI） */
const CasualSkinEquipPanel: React.FC<{ gameId?: string }> = ({ gameId = "solitaire" }) => {
  const casual = useCasualPlatform();
  const [msg, setMsg] = useState<string | null>(null);
  const ownedBundles =
    casual.skinState?.catalog.filter(
      (c) =>
        c.type === "game_visual_bundle" &&
        casual.skinState!.effectiveOwned.includes(c.skinId)
    ) ?? [];

  if (ownedBundles.length === 0) return null;

  return (
    <section className="casual-skin-equip" aria-label="装备外观">
      <h3 className="casual-skin-equip__title">玩法外观</h3>
      {msg ? <p className="casual-skin-equip__msg">{msg}</p> : null}
      <ul className="casual-skin-equip__list">
        {ownedBundles.map((b) => (
          <li key={b.skinId}>
            <span>{b.name}</span>
            <button
              type="button"
              className="casual-skin-equip__btn"
              onClick={async () => {
                const r = await casual.equipSkin({
                  slot: `game:${gameId}`,
                  skinId: b.skinId,
                });
                setMsg(r.ok ? `已装备：${b.name}` : `失败：${r.error ?? "unknown"}`);
              }}
            >
              装备
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default CasualSkinEquipPanel;
