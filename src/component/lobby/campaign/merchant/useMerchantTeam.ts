import { useCallback, useEffect, useState } from "react";

import { api } from "@/convex/sso/convex/_generated/api";
import { ssoConvexClient } from "host/service/AppProviders";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { useUserManager } from "host/service/UserManager";

import { merchantCampaignFns } from "../service/campaignConvexFunctionRefs";
import { useMerchantCampaignClient } from "../service/useMerchantCampaignManager";

export type MerchantTeamMember = {
  uid: string;
  role: string;
  createdAt: number;
  provider?: string;
  email?: string;
  name?: string;
  webAccountId?: string;
  hasWebUser?: boolean;
};

export type MerchantTeamView = {
  merchantId: string;
  merchantName: string;
  partnerId: number;
  myRole: string;
  members: MerchantTeamMember[];
};

export const MERCHANT_STAFF_ROLE_OPTIONS = ["staff"] as const;

export function useMerchantTeam(merchantId: string | null) {
  const { http, authed, fns } = useMerchantCampaignClient();
  const { user } = useUserManager();
  const [team, setTeam] = useState<MerchantTeamView | undefined>(undefined);

  const refresh = useCallback(async () => {
    if (!http || !authed || !merchantId) {
      setTeam(undefined);
      return;
    }
    try {
      const raw = (await http.query(fns.listMerchantTeam, { merchantId })) as MerchantTeamView | null;
      if (!raw) {
        setTeam(undefined);
        return;
      }

      let members: MerchantTeamMember[] = raw.members;
      if (isPlatformAuthed(user) && raw.members.length > 0) {
        try {
          const hints = (await ssoConvexClient.query(
            api.service.partner.merchantStaffIdentity.lookupIdentitiesForMerchantTeam,
            { uids: raw.members.map((m) => m.uid) }
          )) as Array<{
            uid: string;
            provider?: string;
            email?: string;
            name?: string;
            webAccountId?: string;
            hasWebUser?: boolean;
          }>;
          const byUid = new Map(hints.map((h) => [h.uid, h]));
          members = raw.members.map((m) => ({ ...m, ...byUid.get(m.uid) }));
        } catch (e) {
          console.warn("[MerchantTeam] identity lookup failed", e);
        }
      }

      setTeam({ ...raw, members });
    } catch (e) {
      console.error("[MerchantTeam] listMerchantTeam", e);
      setTeam(undefined);
    }
  }, [http, authed, merchantId, fns.listMerchantTeam, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const canManage = team?.myRole === "owner";

  const addStaff = useCallback(
    async (accountId: string, password: string, role: string) => {
      if (!http || !merchantId || !team) throw new Error("unauthenticated");
      const provision = (await ssoConvexClient.action(
        api.service.partner.staffAccountActions.provisionMerchantStaffWebLogin,
        {
          merchantId,
          partnerId: team.partnerId,
          accountId,
          password,
        }
      )) as { uid: string };
      await http.mutation(fns.addMerchantStaff, {
        merchantId,
        uid: provision.uid,
        role: role as "staff",
      });
      await refresh();
    },
    [http, merchantId, team, fns.addMerchantStaff, refresh]
  );

  const removeStaff = useCallback(
    async (uid: string) => {
      if (!http || !merchantId) throw new Error("unauthenticated");
      await http.mutation(fns.removeMerchantStaff, { merchantId, uid });
      await refresh();
    },
    [http, merchantId, fns.removeMerchantStaff, refresh]
  );

  return { team, refresh, canManage, addStaff, removeStaff };
}

export const merchantTeamFns = {
  listMerchantTeam: merchantCampaignFns.listMerchantTeam,
  addMerchantStaff: merchantCampaignFns.addMerchantStaff,
  removeMerchantStaff: merchantCampaignFns.removeMerchantStaff,
  provisionMerchantStaffWebLogin:
    api.service.partner.staffAccountActions.provisionMerchantStaffWebLogin,
  lookupIdentitiesForMerchantTeam:
    api.service.partner.merchantStaffIdentity.lookupIdentitiesForMerchantTeam,
};
