import React from "react";

import type { ProsperityMilestonesView } from "./prosperityMilestones";

export interface ProsperityMilestonesStripProps {
  milestones: ProsperityMilestonesView;
  compact?: boolean;
}

/** Display-only milestone track — no coin payouts, no tournament gates. */
const ProsperityMilestonesStrip: React.FC<ProsperityMilestonesStripProps> = ({
  milestones,
  compact = false,
}) => {
  const { score, next, tiers } = milestones;

  return (
    <section className={`town-prosperity-ms${compact ? " town-prosperity-ms--compact" : ""}`}>
      <div className="town-prosperity-ms__head">
        <strong>Prosperity milestones</strong>
        <span>{score}%</span>
      </div>
      {next ? (
        <p className="town-prosperity-ms__next">
          Next: {next.titleZh} ({next.title}) · {next.remaining}% to go
        </p>
      ) : (
        <p className="town-prosperity-ms__next">All milestones reached — Golden Mayfield!</p>
      )}
      <ul className="town-prosperity-ms__list">
        {tiers.map((tier) => (
          <li
            key={tier.id}
            className={`town-prosperity-ms__tier${tier.reached ? " town-prosperity-ms__tier--done" : ""}`}
          >
            <span className="town-prosperity-ms__tier-mark">{tier.reached ? "✓" : "○"}</span>
            <span className="town-prosperity-ms__tier-body">
              <span className="town-prosperity-ms__tier-title">
                {tier.threshold}% · {tier.titleZh}
              </span>
              {!compact ? <span className="town-prosperity-ms__tier-blurb">{tier.blurb}</span> : null}
            </span>
          </li>
        ))}
      </ul>
      <p className="town-prosperity-ms__note">Cosmetic only — Showdown Week Score unchanged.</p>
    </section>
  );
};

export default ProsperityMilestonesStrip;
