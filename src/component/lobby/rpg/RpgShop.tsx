import React, { useState } from "react";
import { RPG_SHOP_SKUS } from "convex/portal/convex/data/passTrack";
import { getRpgHud, shopBuy } from "./rpgRuntime";

const RpgShop: React.FC = () => {
  const [message, setMessage] = useState("");
  const hud = getRpgHud();
  return (
    <div>
      <div className="rpg-title">商店</div>
      <p className="rpg-note">rpg 钱包 · 花 coin 买票</p>
      {RPG_SHOP_SKUS.map((sku) => (
        <div key={sku.id} className="rpg-card">
          <h3>门票 x{sku.tickets}</h3>
          <p>{sku.coins} coin</p>
          <button
            className="rpg-cta"
            onClick={() => {
              const result = shopBuy(sku.id);
              setMessage(result.ok ? `余额 ${result.wallet?.coins} · 票 ${result.wallet?.tickets}` : result.reason ?? "");
            }}
          >
            购买
          </button>
        </div>
      ))}
      <p className="rpg-note">v1 不开包，不卖 chess / tcg 卡 · 当前 {hud.coins} coin</p>
      {message && <p className="rpg-note">{message}</p>}
    </div>
  );
};

export default RpgShop;
