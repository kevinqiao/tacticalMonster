import React from "react";

import "./townShell.css";

export type TownShellTab = "shop" | "reward" | "hall" | "league" | "me";

export interface TownShellProps {
  active: TownShellTab;
  onChange: (tab: TownShellTab) => void;
  collectablePassive?: number;
  children: React.ReactNode;
}

const TABS: { id: TownShellTab; label: string; icon: string }[] = [
  { id: "shop", label: "Shop", icon: "🛒" },
  { id: "reward", label: "Reward", icon: "🎁" },
  { id: "hall", label: "Hall", icon: "🏛" },
  { id: "league", label: "League", icon: "🏆" },
  { id: "me", label: "Me", icon: "👤" },
];

const TownShell: React.FC<TownShellProps> = ({ active, onChange, collectablePassive = 0, children }) => (
  <div className="town-shell">
    <div className="town-shell__body">{children}</div>
    <nav className="town-shell__nav" aria-label="Mayfield navigation">
      {TABS.map((tab) => (
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
          {tab.id === "hall" && collectablePassive > 0 ? (
            <span className="town-shell__badge" aria-label={`${collectablePassive} coins to collect`} />
          ) : null}
        </button>
      ))}
    </nav>
  </div>
);

export default TownShell;
