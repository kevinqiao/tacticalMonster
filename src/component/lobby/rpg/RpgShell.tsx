import { PageProp } from "component/RenderApp";
import { RPG_SHELL_TABS, RpgShellTabId } from "convex/rpg/architecture";
import React, { useMemo } from "react";
import { usePageManager } from "service/PageManager";
import { useUserManager } from "service/UserManager";
import RpgCodex from "./RpgCodex";
import RpgHall from "./RpgHall";
import RpgHome from "./RpgHome";
import RpgLeague from "./RpgLeague";
import RpgLoadout from "./RpgLoadout";
import RpgPreview from "./RpgPreview";
import RpgRewards from "./RpgRewards";
import RpgShop from "./RpgShop";
import "./rpg.css";
import { getRpgHud, setRpgUid, subscribeRpg } from "./rpgRuntime";

function screenFromUri(uri?: string): { tab: RpgShellTabId; view: string } {
  const path = uri || "/rpg/home";
  if (path.includes("/shop")) return { tab: "shop", view: "shop" };
  if (path.includes("/rewards")) return { tab: "rewards", view: "rewards" };
  if (path.includes("/league")) return { tab: "league", view: "league" };
  if (path.includes("/me")) return { tab: "me", view: "me" };
  if (path.includes("/loadout")) return { tab: "battle", view: "loadout" };
  if (path.includes("/preview") || path.includes("/table")) return { tab: "battle", view: "preview" };
  if (path.includes("/hall")) return { tab: "battle", view: "hall" };
  return { tab: "battle", view: "home" };
}

const RpgShell: React.FC<PageProp> = ({ visible }) => {
  const { openPage, changeEvent } = usePageManager();
  const { user } = useUserManager();
  const [, setTick] = React.useState(0);
  React.useEffect(() => subscribeRpg(() => setTick((n) => n + 1)), []);
  if (user?.uid) setRpgUid(user.uid);
  const uri = changeEvent?.page?.uri;
  const { tab, view } = screenFromUri(uri);
  const hud = getRpgHud();
  const hideTabs = view === "match";

  const body = useMemo(() => {
    switch (view) {
      case "shop":
        return <RpgShop />;
      case "rewards":
        return <RpgRewards />;
      case "league":
        return <RpgLeague />;
      case "me":
        return <RpgCodex />;
      case "hall":
        return <RpgHall />;
      case "preview":
        return <RpgPreview />;
      case "loadout":
        return <RpgLoadout />;
      default:
        return <RpgHome />;
    }
  }, [view]);

  if (!visible) return null;

  return (
    <div className="rpg-shell">
      <div className="rpg-hud">
        <span>金 III</span>
        <span>周 {hud.weekPoints} 分</span>
        <span>{hud.coins} · 票 {hud.tickets}</span>
      </div>
      <div className="rpg-body">{body}</div>
      {!hideTabs && (
        <nav className="rpg-tabs">
          {RPG_SHELL_TABS.map((item) => (
            <button
              key={item.id}
              className={`rpg-tab${tab === item.id ? " active" : ""}`}
              onClick={() => openPage({ uri: item.path === "/rpg" ? "/rpg/home" : item.path })}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
};

export default RpgShell;
