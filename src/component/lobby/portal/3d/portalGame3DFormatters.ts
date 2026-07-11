import i18n from "@/i18n";

import { leaveMatchQueueErrorText } from "../shared/portalErrorMessage";

export { leaveMatchQueueErrorText };

export function formatWeekRemaining(endsAt: number | null | undefined): string {
  if (!endsAt) return "";
  const ms = Math.max(0, endsAt - Date.now());
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(h / 24);
  const rh = h % 24;
  if (d > 0) {
    return i18n.t("lobby.weekRemaining", {
      ns: "portal.player",
      days: d,
      hours: rh,
    });
  }
  return i18n.t("lobby.weekRemainingHours", { ns: "portal.player", hours: rh });
}
