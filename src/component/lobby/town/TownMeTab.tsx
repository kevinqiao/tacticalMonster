import React, { useState } from "react";

import { usePortal } from "component/lobby/portal/service/usePortalManager";

import "./townShell.css";
import type { EntertainmentBonusView } from "./TownZonePanel";
import ProsperityMilestonesStrip from "./ProsperityMilestonesStrip";
import type { ProsperityMilestonesView } from "./prosperityMilestones";
import { FALLBACK_PROSPERITY_MILESTONES } from "./prosperityMilestones";
import { districtLabel } from "./mayfieldSceneLayout";

export interface TownMeTabProps {
  seasonLevel: number;
  coins?: number;
  gems?: number;
  prosperityScore: number;
  venueLevel: { trial: number; showdown: number };
  unlockedDistricts: string[];
  currentDistrict?: string;
  prosperityMilestones?: ProsperityMilestonesView;
  entertainmentBonus?: EntertainmentBonusView;
  coinTableBonus?: EntertainmentBonusView;
  termPass?: { completedMain: number; mainNodes: number; claimableCount: number } | null;
  gameCodex?: Array<{ gameType: string; label: string; opened: boolean; played: boolean }>;
  ownedTitles?: string[];
  onOpenReward?: () => void;
}

const TownMeTab: React.FC<TownMeTabProps> = ({
  seasonLevel,
  coins,
  gems,
  prosperityScore,
  venueLevel,
  unlockedDistricts,
  currentDistrict = "D0",
  prosperityMilestones = FALLBACK_PROSPERITY_MILESTONES,
  entertainmentBonus,
  coinTableBonus,
  termPass,
  gameCodex,
  ownedTitles,
  onOpenReward,
}) => {
  const portal = usePortal();
  const wallet = portal.playerWallet;
  const profile = portal.playerProfile;
  const [nameDraft, setNameDraft] = useState(profile?.displayName ?? "");

  return (
    <div className="town-tab-panel">
      <h2>Mayor</h2>
      {termPass ? (
        <button type="button" className="town-tab-panel__card" onClick={onOpenReward}>
          <strong>
            Pass {termPass.completedMain}/{termPass.mainNodes}
            {termPass.claimableCount > 0 ? " · claim" : ""}
          </strong>
        </button>
      ) : null}
      {ownedTitles && ownedTitles.length > 0 ? (
        <div className="town-tab-panel__card">
          <strong>Titles</strong>
          <p>{ownedTitles.join(" · ")}</p>
        </div>
      ) : null}
      {gameCodex && gameCodex.length > 0 ? (
        <div className="town-tab-panel__card">
          <strong>Games</strong>
          {gameCodex.map((row) => (
            <div key={row.gameType} className="town-tab-panel__row">
              <span>{row.label}</span>
              <span>{row.played ? "Played" : row.opened ? "Opened" : "Locked"}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="town-tab-panel__card">
        <div className="town-tab-panel__row">
          <span>Season Lv</span>
          <span>{seasonLevel}</span>
        </div>
        <div className="town-tab-panel__row">
          <span>Prosperity</span>
          <span>{prosperityScore}%</span>
        </div>
        <div className="town-tab-panel__row">
          <span>Solo Challenge Lv</span>
          <span>{venueLevel.trial}</span>
        </div>
        <div className="town-tab-panel__row">
          <span>Showdown Arena Lv</span>
          <span>{venueLevel.showdown}</span>
        </div>
        {entertainmentBonus ? (
          <div className="town-tab-panel__row">
            <span>Showdown this week</span>
            <span>
              {entertainmentBonus.gamesThisWeek}/{entertainmentBonus.minGamesPerWeek}
              {entertainmentBonus.active ? " · bonus on" : ""}
            </span>
          </div>
        ) : null}
        {coinTableBonus ? (
          <div className="town-tab-panel__row">
            <span>Coin tables this week</span>
            <span>
              {coinTableBonus.gamesThisWeek}/{coinTableBonus.minGamesPerWeek}
              {coinTableBonus.active ? " · bonus on" : ""}
            </span>
          </div>
        ) : null}
        <div className="town-tab-panel__row">
          <span>Current district</span>
          <span>{districtLabel(currentDistrict)}</span>
        </div>
        <div className="town-tab-panel__row">
          <span>Districts</span>
          <span>{unlockedDistricts.map((id) => districtLabel(id)).join(", ")}</span>
        </div>
        <div className="town-tab-panel__row">
          <span>Coins</span>
          <span>{(coins ?? wallet?.coins)?.toLocaleString() ?? "—"}</span>
        </div>
        <div className="town-tab-panel__row">
          <span>Gems</span>
          <span>{(gems ?? wallet?.gems)?.toLocaleString() ?? "—"}</span>
        </div>
        <div className="town-tab-panel__row">
          <span>Replay tokens</span>
          <span>{portal.replayTokenCount.toLocaleString()}</span>
        </div>
      </div>
      <ProsperityMilestonesStrip milestones={prosperityMilestones} />
      {profile ? (
        <div className="town-tab-panel__card">
          <label htmlFor="mayor-name">Display name</label>
          <input
            id="mayor-name"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            style={{ width: "100%", marginTop: 8, padding: 8, borderRadius: 8 }}
          />
          <button
            type="button"
            className="town-btn-primary"
            style={{ marginTop: 8 }}
            onClick={() =>
              void portal.updatePortalDisplayName(nameDraft.trim()).then(() => portal.refresh())
            }
          >
            Save
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default TownMeTab;
