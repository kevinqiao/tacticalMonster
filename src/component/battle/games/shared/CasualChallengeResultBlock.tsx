import React from "react";
import { useTranslation } from "react-i18next";

import {
  casualChallengeTitleKey,
  type CasualGameScoreChallengeUI,
} from "./casualGameScoreReportUI";

export function casualChallengeResultTone(
  challenge: CasualGameScoreChallengeUI
): "stars3" | "stars1" | "success" | "fail" {
  if (challenge.tierP75 && challenge.tierP90) {
    if (challenge.tierP90.reached) return "stars3";
    if (challenge.tierP75.reached) return "stars1";
    return "fail";
  }
  return challenge.success ? "success" : "fail";
}

export function CasualChallengeResultTitle({
  challenge,
  fallback,
}: {
  challenge?: CasualGameScoreChallengeUI;
  fallback: string;
}) {
  const { t } = useTranslation("shared.casual");
  if (!challenge) return <>{fallback}</>;
  return <>{t(`scoreReport.${casualChallengeTitleKey(challenge)}`)}</>;
}

/** 结算弹窗 / 铁人三项中场：clear 或双星达标块 */
export const CasualChallengeResultBlock: React.FC<{
  challenge: CasualGameScoreChallengeUI;
}> = ({ challenge }) => {
  const { t } = useTranslation("shared.casual");
  const hasDualTiers = Boolean(challenge.tierP75 && challenge.tierP90);
  const tone = casualChallengeResultTone(challenge);

  return (
    <div
      className={[
        "msc-challengeResult",
        tone === "stars3" || tone === "success"
          ? "msc-challengeResult--success"
          : tone === "stars1"
            ? "msc-challengeResult--partial"
            : "msc-challengeResult--fail",
      ].join(" ")}
      role="status"
    >
      <span className="msc-challengeResult__badge">
        {tone === "stars3"
          ? t("scoreReport.stars3Badge")
          : tone === "stars1"
            ? t("scoreReport.stars1Badge")
            : tone === "success"
              ? t("scoreReport.successBadge")
              : t("scoreReport.failBadge")}
      </span>
      <div className="msc-challengeResult__rows">
        {hasDualTiers ? (
          <>
            <div
              className={[
                "msc-challengeResult__row",
                "msc-challengeResult__row--tier",
                challenge.tierP75!.reached
                  ? "msc-challengeResult__row--reached"
                  : "msc-challengeResult__row--missed",
              ].join(" ")}
            >
              <span className="msc-challengeResult__stars" aria-hidden>
                ★
              </span>
              <span className="msc-challengeResult__tierLabel">
                {t("scoreReport.star1Target")}
              </span>
              <span className="msc-challengeResult__val">
                {challenge.tierP75!.score.toLocaleString()}
              </span>
              <span className="msc-challengeResult__mark">
                {challenge.tierP75!.reached
                  ? t("scoreReport.tierReached")
                  : t("scoreReport.tierMissed")}
              </span>
            </div>
            <div
              className={[
                "msc-challengeResult__row",
                "msc-challengeResult__row--tier",
                challenge.tierP90!.reached
                  ? "msc-challengeResult__row--reached"
                  : "msc-challengeResult__row--missed",
              ].join(" ")}
            >
              <span className="msc-challengeResult__stars" aria-hidden>
                ★★★
              </span>
              <span className="msc-challengeResult__tierLabel">
                {t("scoreReport.star3Target")}
              </span>
              <span className="msc-challengeResult__val">
                {challenge.tierP90!.score.toLocaleString()}
              </span>
              <span className="msc-challengeResult__mark">
                {challenge.tierP90!.reached
                  ? t("scoreReport.tierReached")
                  : t("scoreReport.tierMissed")}
              </span>
            </div>
          </>
        ) : (
          <div className="msc-challengeResult__row">
            <span>{t("scoreReport.targetP75")}</span>
            <span className="msc-challengeResult__val">
              {challenge.targetScore.toLocaleString()}
            </span>
          </div>
        )}
        <div className="msc-challengeResult__row">
          <span>{t("scoreReport.gameScore")}</span>
          <span className="msc-challengeResult__val">
            {challenge.achievedScore.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};
