import { useCallback, useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";

import { api } from "@/convex/sso/convex/_generated/api";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { useUserManager } from "host/service/UserManager";

import { useMerchantAdminAuth } from "./useMerchantAdminAuth";

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
  storeId: string;
  storeName: string;
  partnerId: number;
  myRole: string;
  members: MerchantTeamMember[];
};

export const MERCHANT_STAFF_ROLE_OPTIONS = ["staff"] as const;

export function useMerchantTeam(storeId: string | null) {
  const { authed } = useMerchantAdminAuth();
  const { user } = useUserManager();
  const rawTeam = useQuery(
    api.service.partner.storeAdmin.listStoreTeam,
    authed && storeId ? { storeId } : "skip"
  );
  const identityHints = useQuery(
    api.service.partner.storeStaffIdentity.lookupIdentitiesForStoreTeam,
    authed && isPlatformAuthed(user) && rawTeam && rawTeam.members.length > 0
      ? { uids: rawTeam.members.map((m) => m.uid) }
      : "skip"
  );
  const addStoreStaff = useMutation(api.service.partner.storeAdmin.addStoreStaff);
  const removeStoreStaffMut = useMutation(api.service.partner.storeAdmin.removeStoreStaff);
  const provisionLogin = useAction(
    api.service.partner.staffAccountActions.provisionStoreStaffWebLogin
  );
  const [team, setTeam] = useState<MerchantTeamView | undefined>(undefined);

  useEffect(() => {
    if (!rawTeam) {
      setTeam(undefined);
      return;
    }
    const byUid = new Map((identityHints ?? []).map((h) => [h.uid, h]));
    const members = rawTeam.members.map((m) => ({ ...m, ...byUid.get(m.uid) }));
    setTeam({
      storeId: rawTeam.storeId,
      storeName: rawTeam.storeName,
      partnerId: rawTeam.partnerId,
      myRole: rawTeam.myRole,
      members,
    });
  }, [rawTeam, identityHints]);

  const refresh = useCallback(async () => {
    // Convex useQuery is live; no manual refresh needed.
  }, []);

  const canManage = team?.myRole === "owner";

  const addStaff = useCallback(
    async (accountId: string, password: string, role: string) => {
      if (!storeId || !team) throw new Error("unauthenticated");
      const provision = (await provisionLogin({
        storeId,
        partnerId: team.partnerId,
        accountId,
        password,
      })) as { uid: string };
      await addStoreStaff({
        storeId,
        uid: provision.uid,
        role: role as "staff",
      });
    },
    [storeId, team, provisionLogin, addStoreStaff]
  );

  const removeStaff = useCallback(
    async (uid: string) => {
      if (!storeId) throw new Error("unauthenticated");
      await removeStoreStaffMut({ storeId, uid });
    },
    [storeId, removeStoreStaffMut]
  );

  return { team, refresh, canManage, addStaff, removeStaff };
}

export const merchantTeamFns = {
  listStoreTeam: api.service.partner.storeAdmin.listStoreTeam,
  addStoreStaff: api.service.partner.storeAdmin.addStoreStaff,
  removeStoreStaff: api.service.partner.storeAdmin.removeStoreStaff,
  provisionStoreStaffWebLogin:
    api.service.partner.staffAccountActions.provisionStoreStaffWebLogin,
  lookupIdentitiesForStoreTeam:
    api.service.partner.storeStaffIdentity.lookupIdentitiesForStoreTeam,
};
