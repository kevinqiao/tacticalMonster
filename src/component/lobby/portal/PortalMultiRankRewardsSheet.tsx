import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { PortalCenterModal } from "./PortalCenterModal";
import { localizePortalTournamentTitle } from "./portalTournamentLocalize";
import { buildMultiRankRewardsView } from "./portalMultiRankRewards";

type Props = {
  open: boolean;
  tournamentId: string | null;
  /** Optional display title override from lobby offering. */
  titleOverride?: string | null;
  onClose: () => void;
};

function formatSigned(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

/** Compact rank × points (/ coins) schedule for one multi tournament. */
export const PortalMultiRankRewardsSheet: React.FC<Props> = ({
  open,
  tournamentId,
  titleOverride,
  onClose,
}) => {
  const { t } = useTranslation("portal.player");
  const view = useMemo(
    () => (tournamentId ? buildMultiRankRewardsView(tournamentId) : null),
    [tournamentId]
  );

  const title = tournamentId
    ? t("lobby.rankRewardsTitle", {
        name: localizePortalTournamentTitle(
          tournamentId,
          tournamentId,
          titleOverride
        ),
      })
    : t("lobby.rankRewards");

  return (
    <PortalCenterModal
      open={open && view != null}
      title={title}
      onClose={onClose}
      stacked
    >
      {view ? (
        <div className="portal-rank-rewards">
          {view.entryCoins != null ? (
            <p className="portal-rank-rewards-entry">
              {t("lobby.rankRewardsEntry", {
                amount: view.entryCoins,
              })}
            </p>
          ) : null}
          <table className="portal-rank-rewards-table">
            <thead>
              <tr>
                <th scope="col">{t("lobby.rankRewardsRank")}</th>
                <th scope="col">{t("lobby.rankRewardsPoints")}</th>
                {view.showCoins ? (
                  <th scope="col">{t("lobby.rankRewardsCoins")}</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {view.rows.map((row) => (
                <tr key={row.rank}>
                  <td>{t("lobby.rankLabel", { rank: row.rank })}</td>
                  <td
                    className={
                      row.points >= 0 ? "portal-pts-pos" : "portal-pts-neg"
                    }
                  >
                    {formatSigned(row.points)}
                  </td>
                  {view.showCoins ? (
                    <td className="portal-pts-pos">
                      {row.coins != null
                        ? `+${row.coins}`
                        : t("common.dash")}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </PortalCenterModal>
  );
};

export default PortalMultiRankRewardsSheet;
