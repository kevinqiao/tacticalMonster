import React, { useState } from "react";

import { usePortal } from "component/lobby/portal/service/usePortalManager";

import "./townShell.css";
import type { EntertainmentBonusView } from "./TownZonePanel";
import ProsperityMilestonesStrip from "./ProsperityMilestonesStrip";
import type { ProsperityMilestonesView } from "./prosperityMilestones";
import { FALLBACK_PROSPERITY_MILESTONES } from "./prosperityMilestones";

export interface TownMeTabProps {
  mayorLevel: number;
  prosperityScore: number;
  venueLevel: { trial: number; showdown: number };
  unlockedDistricts: string[];
  prosperityMilestones?: ProsperityMilestonesView;
  entertainmentBonus?: EntertainmentBonusView;
}

const TownMeTab: React.FC<TownMeTabProps> = ({
  mayorLevel,
  prosperityScore,
  venueLevel,
  unlockedDistricts,
  prosperityMilestones = FALLBACK_PROSPERITY_MILESTONES,
  entertainmentBonus,
}) => {
  const portal = usePortal();
  const wallet = portal.playerWallet;
  const profile = portal.playerProfile;
  const [nameDraft, setNameDraft] = useState(profile?.displayName ?? "");

  return (
    <div className="town-tab-panel">
      <h2>Mayor</h2>
      <div className="town-tab-panel__card">
        <div className="town-tab-panel__row">
          <span>Mayor Lv</span>
          <span>{mayorLevel}</span>
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
        <div className="town-tab-panel__row">
          <span>Districts</span>
          <span>{unlockedDistricts.join(", ")}</span>
        </div>
        <div className="town-tab-panel__row">
          <span>Coins</span>
          <span>{wallet?.coins?.toLocaleString() ?? "—"}</span>
        </div>
        <div className="town-tab-panel__row">
          <span>Gems</span>
          <span>{wallet?.gems?.toLocaleString() ?? "—"}</span>
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
