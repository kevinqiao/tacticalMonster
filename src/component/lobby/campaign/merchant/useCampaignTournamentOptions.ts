import { useMemo } from "react";

import { listCampaignTournamentOptions } from "@/convex/campaign/convex/service/merchant/campaignTournament";

export type CampaignTournamentOption = {
  tournamentId: string;
  title: string;
  gameType: string;
  mode: "solo" | "multi";
  label: string;
};

/** Static Portal tournament desks for campaign create/edit. */
export function useCampaignTournamentOptions() {
  const options = useMemo<CampaignTournamentOption[]>(
    () => listCampaignTournamentOptions(),
    []
  );
  return { options, loading: false, error: null as string | null };
}
