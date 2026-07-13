import React from "react";
import { useTranslation } from "react-i18next";

export type PortalBackpackPanelProps = {
  replayTokenCount?: number | null;
  adReplayDailyRemaining?: number | null;
  giftCardOrderCount?: number;
  onOpenGiftCards?: () => void;
};

export function PortalBackpackPanel({
  replayTokenCount = 0,
  adReplayDailyRemaining = null,
  giftCardOrderCount = 0,
  onOpenGiftCards,
}: PortalBackpackPanelProps) {
  const { t } = useTranslation("portal.player");
  const tokens =
    typeof replayTokenCount === "number" && Number.isFinite(replayTokenCount)
      ? Math.max(0, Math.floor(replayTokenCount))
      : 0;
  const showAdReplay =
    typeof adReplayDailyRemaining === "number" &&
    Number.isFinite(adReplayDailyRemaining);
  const adRemaining = showAdReplay
    ? Math.max(0, Math.floor(adReplayDailyRemaining))
    : 0;

  return (
    <div className="portal-backpack-panel">
      <ul className="portal-backpack-panel__list">
        <li className="portal-backpack-panel__row">
          <span className="portal-backpack-panel__label">
            {t("lobby.accountMenu.replayTokens")}
          </span>
          <span className="portal-backpack-panel__value">{tokens}</span>
        </li>
        {showAdReplay ? (
          <li className="portal-backpack-panel__row">
            <span className="portal-backpack-panel__label">
              {t("lobby.accountMenu.adReplayRemaining")}
            </span>
            <span className="portal-backpack-panel__value">{adRemaining}</span>
          </li>
        ) : null}
        <li className="portal-backpack-panel__row">
          <span className="portal-backpack-panel__label">
            {t("lobby.accountMenu.coupons")}
          </span>
          <span className="portal-backpack-panel__value portal-backpack-panel__value--empty">
            {t("lobby.accountMenu.emptyItem")}
          </span>
        </li>
        <li className="portal-backpack-panel__row">
          <span className="portal-backpack-panel__label">
            {t("lobby.accountMenu.tickets")}
          </span>
          <span className="portal-backpack-panel__value portal-backpack-panel__value--empty">
            {t("lobby.accountMenu.emptyItem")}
          </span>
        </li>
      </ul>
      {onOpenGiftCards ? (
        <button
          type="button"
          className="portal-backpack-panel__link"
          onClick={onOpenGiftCards}
        >
          {t("lobby.accountMenu.viewGiftCards", {
            count: giftCardOrderCount,
          })}
        </button>
      ) : null}
    </div>
  );
}
