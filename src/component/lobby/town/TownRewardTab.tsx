import React, { useCallback, useState } from "react";

import { usePortal } from "component/lobby/portal/service/usePortalManager";

import "./townShell.css";

const TownRewardTab: React.FC<{ onToast: (msg: string) => void }> = ({ onToast }) => {
  const portal = usePortal();
  const checkin = portal.dailyCheckin;
  const [busy, setBusy] = useState(false);

  const claim = useCallback(async () => {
    setBusy(true);
    try {
      const r = await portal.claimDailyCheckin();
      if (r.ok) {
        const parts: string[] = [];
        if (r.ticketsGranted) parts.push(`${r.ticketsGranted} tickets`);
        if (r.coinsGranted) parts.push(`${r.coinsGranted} coins`);
        onToast(parts.length ? `Claimed ${parts.join(" + ")}` : "Checked in!");
        await portal.refresh();
      } else {
        onToast(r.error ?? "Check-in failed");
      }
    } finally {
      setBusy(false);
    }
  }, [portal, onToast]);

  return (
    <div className="town-tab-panel">
      <h2>Rewards</h2>
      <p>Daily check-in and streak bonuses feed your town wallet.</p>
      <div className="town-tab-panel__card">
        <strong>Daily check-in</strong>
        {checkin ? (
          <>
            <div className="town-tab-panel__row">
              <span>Streak</span>
              <span>{checkin.streakCount} days</span>
            </div>
            <div className="town-tab-panel__row">
              <span>Today</span>
              <span>
                {checkin.alreadyClaimedToday
                  ? "Claimed"
                  : `+${checkin.baseCoins} coins · +${checkin.baseTickets} tickets`}
              </span>
            </div>
            {!checkin.alreadyClaimedToday ? (
              <button type="button" className="town-btn-primary" disabled={busy} onClick={() => void claim()}>
                Claim
              </button>
            ) : null}
          </>
        ) : (
          <p className="town-tab-panel__empty">Sign in to claim daily rewards.</p>
        )}
      </div>
      {portal.adCoinOffer?.enabled ? (
        <div className="town-tab-panel__card">
          <strong>Watch ad</strong>
          <p>+{portal.adCoinOffer.rewardAmount} coins ({portal.adCoinOffer.remaining} left today)</p>
          <button
            type="button"
            className="town-btn-primary"
            disabled={busy || portal.adCoinOffer.remaining <= 0}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await portal.watchAdForCoins();
                if (r.ok) onToast(`+${r.coinsGranted} coins`);
                else onToast(r.error ?? "Ad failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            Watch ad
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default TownRewardTab;
