import React, { useEffect, useState } from "react";

import "./townShell.css";

export type TownShellTab = "shop" | "reward" | "town" | "league" | "me";
export type TownDrawerTab = Exclude<TownShellTab, "town">;

export interface TownShellProps {
  active: TownShellTab;
  onChange: (tab: TownShellTab) => void;
  collectablePassive?: number;
  avatarUrl?: string;
  avatarInitial?: string;
  onAvatarClick?: () => void;
  chromeWallet?: React.ReactNode;
  chromeEnd?: React.ReactNode;
  landscape?: boolean;
  drawer?: React.ReactNode;
  onCloseDrawer?: () => void;
  children: React.ReactNode;
}

const PORTRAIT_TABS: { id: TownShellTab; label: string; icon: string }[] = [
  { id: "shop", label: "Shop", icon: "🛒" },
  { id: "reward", label: "Rewards", icon: "🎁" },
  { id: "town", label: "Town", icon: "🏛" },
  { id: "league", label: "League", icon: "🏆" },
  { id: "me", label: "Me", icon: "👤" },
];

const LANDSCAPE_TABS: { id: TownDrawerTab; label: string; icon: string }[] = [
  { id: "shop", label: "Shop", icon: "🛒" },
  { id: "reward", label: "Rewards", icon: "🎁" },
  { id: "league", label: "League", icon: "🏆" },
  { id: "me", label: "Me", icon: "👤" },
];

const TownShell: React.FC<TownShellProps> = ({
  active,
  onChange,
  collectablePassive = 0,
  avatarUrl,
  avatarInitial = "M",
  onAvatarClick,
  chromeWallet,
  chromeEnd,
  landscape = false,
  drawer = null,
  onCloseDrawer,
  children,
}) => {
  const tabs = landscape ? LANDSCAPE_TABS : PORTRAIT_TABS;
  const wantsDrawer = Boolean(landscape && drawer);
  const [heldDrawer, setHeldDrawer] = useState<React.ReactNode>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (drawer) setHeldDrawer(drawer);
  }, [drawer]);

  useEffect(() => {
    if (!wantsDrawer) {
      setDrawerOpen(false);
      return;
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setDrawerOpen(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [wantsDrawer]);

  useEffect(() => {
    if (wantsDrawer || drawerOpen || !heldDrawer) return;
    const id = window.setTimeout(() => setHeldDrawer(null), 420);
    return () => window.clearTimeout(id);
  }, [wantsDrawer, drawerOpen, heldDrawer]);

  const showDrawer = Boolean(landscape && heldDrawer);

  return (
    <div className={`town-shell${landscape ? " town-shell--landscape" : ""}`}>
      <header className="town-shell__chrome">
        <div className="town-shell__identity">
          <button
            type="button"
            className={`town-shell__avatar${active === "me" ? " town-shell__avatar--active" : ""}`}
            onClick={onAvatarClick}
            title="Mayor"
            aria-label="Open mayor profile"
            aria-current={active === "me" ? "page" : undefined}
          >
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <span aria-hidden>{avatarInitial}</span>}
          </button>
          {chromeWallet ? <div className="town-shell__wallet">{chromeWallet}</div> : null}
        </div>
        {chromeEnd ? <div className="town-shell__chrome-end">{chromeEnd}</div> : null}
      </header>
      <div className="town-shell__body">{children}</div>
      {showDrawer ? (
        <>
          <button
            type="button"
            className={`town-shell__scrim${drawerOpen ? " town-shell__scrim--open" : ""}`}
            aria-label="Close panel"
            onClick={onCloseDrawer}
          />
          <aside
            className={`town-shell__drawer${drawerOpen ? " town-shell__drawer--open" : ""}`}
            aria-label="Town panel"
            onTransitionEnd={(event) => {
              if (event.propertyName !== "transform") return;
              if (!drawerOpen) setHeldDrawer(null);
            }}
          >
            {heldDrawer}
          </aside>
        </>
      ) : null}
      <nav className="town-shell__nav" aria-label="Mayfield navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`town-shell__tab${active === tab.id ? " town-shell__tab--active" : ""}`}
            onClick={() => onChange(tab.id)}
            aria-current={active === tab.id ? "page" : undefined}
          >
            <span className="town-shell__tab-icon" aria-hidden>
              {tab.icon}
            </span>
            <span className="town-shell__tab-label">{tab.label}</span>
            {tab.id === "town" && collectablePassive > 0 ? (
              <span className="town-shell__badge" aria-label={`${collectablePassive} coins to collect`} />
            ) : null}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TownShell;
