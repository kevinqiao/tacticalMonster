import { api } from "@/convex/sso/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { useUserManager } from "host/service/UserManager";

export const platformAdminFns = {
  signInWebAccount: api.service.auth.webConsoleAuth.signInWebAccount,
  getPlatformOperatorAccess: api.service.partner.platformAdmin.getPlatformOperatorAccess,
  listAllPartners: api.service.partner.platformAdmin.listAllPartners,
  createPartner: api.service.partner.platformAdmin.createPartner,
  listPlatformTeam: api.service.partner.platformAdmin.listPlatformTeam,
  addPlatformStaff: api.service.partner.staffAccountActions.addPlatformStaff,
  removePlatformStaff: api.service.partner.platformAdmin.removePlatformStaff,
};

export function usePlatformAdminAuth() {
  const { user } = useUserManager();
  return {
    user,
    authed: isPlatformAuthed(user),
  };
}

export function usePlatformOperatorAccess() {
  const { authed } = usePlatformAdminAuth();
  return useQuery(platformAdminFns.getPlatformOperatorAccess, authed ? {} : "skip");
}

export function useAllPartners(enabled: boolean) {
  const { authed } = usePlatformAdminAuth();
  return useQuery(platformAdminFns.listAllPartners, authed && enabled ? {} : "skip");
}

export function usePlatformTeam(enabled: boolean) {
  const { authed } = usePlatformAdminAuth();
  return useQuery(platformAdminFns.listPlatformTeam, authed && enabled ? {} : "skip");
}

export function usePlatformAdminMutations() {
  return {
    createPartner: useMutation(platformAdminFns.createPartner),
    addPlatformStaff: useAction(platformAdminFns.addPlatformStaff),
    removePlatformStaff: useMutation(platformAdminFns.removePlatformStaff),
  };
}
