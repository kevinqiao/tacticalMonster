import { useCallback, useEffect, useState } from "react";

import { api } from "@/convex/sso/convex/_generated/api";
import { ssoConvexClient } from "host/service/AppProviders";

export type PartnerGameOption = { value: string; label: string };

/** Load partner.games options for merchant campaign pickers via SSO. */
export function usePartnerGameOptions(partnerId: number | null) {
  const [options, setOptions] = useState<PartnerGameOption[] | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (partnerId == null || !Number.isFinite(partnerId) || partnerId < 0) {
      setOptions(undefined);
      return;
    }
    try {
      const row = (await ssoConvexClient.query(api.service.partner.partnerAdmin.getPartnerGames, {
        partnerId,
      })) as { options: PartnerGameOption[] } | null;
      setOptions(row?.options ?? []);
      setError(null);
    } catch (e) {
      console.warn("[usePartnerGameOptions]", e);
      setOptions([]);
      setError("partner_games_unavailable");
    }
  }, [partnerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { options, error, refresh, loading: options === undefined && !error };
}
