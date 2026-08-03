import React from "react";

import { buildSeasonMarkTemplates } from "@/convex/portal/convex/data/portalBadgeTemplates";
import { portalSeasonDisplayN } from "@/convex/portal/convex/data/portalSeasonHonorConfig";

type Props = {
  open: boolean;
  seasonId: string;
  seasonLevel: number;
  onViewBadges: () => void;
  onDismiss: () => void;
};

export function PortalSeasonMarksModal({
  open,
  seasonId,
  seasonLevel,
  onViewBadges,
  onDismiss,
}: Props) {
  if (!open) return null;
  const displayN = portalSeasonDisplayN(seasonId);
  const marks = buildSeasonMarkTemplates(seasonId, displayN);

  return (
    <div className="portal-season-marks-modal" role="dialog" aria-modal="true">
      <div className="portal-season-marks-modal__card">
        <h2>Season {displayN} Complete</h2>
        <p className="portal-season-marks-modal__sub">
          Final season level: {seasonLevel}
        </p>
        <div className="portal-season-marks-modal__marks">
          {marks.map((m) => {
            const unlocked = seasonLevel >= m.threshold;
            return (
              <div
                key={m.badgeId}
                className={`portal-season-marks-modal__mark${
                  unlocked ? "" : " portal-season-marks-modal__mark--locked"
                }`}
              >
                <span
                  className="portal-badges-wall__icon"
                  style={{
                    backgroundImage:
                      "url(/assets/portal/3d/ui/icon-trophy-gold.webp)",
                  }}
                />
                <span>{m.title.replace(`Season ${displayN} · `, "")}</span>
              </div>
            );
          })}
        </div>
        <p className="portal-season-marks-modal__note">
          These marks stay in your Badges forever. Season level resets next
          season.
        </p>
        <button
          type="button"
          className="portal-season-marks-modal__primary"
          onClick={onViewBadges}
        >
          View Badges
        </button>
        <button
          type="button"
          className="portal-season-marks-modal__secondary"
          onClick={onDismiss}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
