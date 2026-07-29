import { useMemo } from "react";

import {
  PARTNER_GAME_LABELS,
  PARTNER_GAME_TYPES,
} from "@/convex/sso/convex/service/partner/portalPartnerConfig";

export type PartnerGameOption = { value: string; label: string };

/** Static catalog options for merchant campaign pickers (all partners fully open). */
export function usePartnerGameOptions(_partnerId: number | null) {
  const options = useMemo<PartnerGameOption[]>(
    () =>
      PARTNER_GAME_TYPES.map((gameType) => ({
        value: gameType,
        label: PARTNER_GAME_LABELS[gameType],
      })),
    []
  );

  return {
    options,
    error: null as string | null,
    refresh: async () => undefined,
    loading: false,
  };
}
