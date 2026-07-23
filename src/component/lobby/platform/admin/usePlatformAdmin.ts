import { api } from "@/convex/sso/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { useUserManager } from "host/service/UserManager";

export const platformAdminFns = {
  signInWebAccount: api.service.auth.webConsoleAuth.signInWebAccount,
  getPlatformOperatorAccess: api.service.partner.platformAdmin.getPlatformOperatorAccess,
  listAllPartners: api.service.partner.platformAdmin.listAllPartners,
  createPartner: api.service.partner.platformAdmin.createPartner,
  deletePartner: api.service.partner.platformAdmin.deletePartner,
  updatePartnerCapabilities: api.service.partner.platformAdmin.updatePartnerCapabilities,
  listPlatformTeam: api.service.partner.platformAdmin.listPlatformTeam,
  addPlatformStaff: api.service.partner.staffAccountActions.addPlatformStaff,
  updatePlatformStaffProfile: api.service.partner.staffAccountActions.updatePlatformStaffProfile,
  removePlatformStaff: api.service.partner.platformAdmin.removePlatformStaff,
  getPartnerPortalConfig: api.service.partner.platformAdmin.getPartnerPortalConfig,
  updatePartnerPortalConfig: api.service.partner.platformAdmin.updatePartnerPortalConfig,
  getPlatformPartnerShopSettings:
    api.service.partner.platformPartnerShopAdmin.getPlatformPartnerShopSettings,
  savePlatformPartnerShopSettings:
    api.service.partner.platformPartnerShopAdmin.savePlatformPartnerShopSettings,
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

export function usePartnerPortalConfig(partnerId: number | null) {
  const { authed } = usePlatformAdminAuth();
  return useQuery(
    platformAdminFns.getPartnerPortalConfig,
    authed && partnerId != null ? { partnerId } : "skip"
  );
}

export function usePlatformAdminMutations() {
  return {
    createPartner: useMutation(platformAdminFns.createPartner),
    deletePartner: useMutation(platformAdminFns.deletePartner),
    updatePartnerCapabilities: useMutation(platformAdminFns.updatePartnerCapabilities),
    addPlatformStaff: useAction(platformAdminFns.addPlatformStaff),
    updatePlatformStaffProfile: useAction(platformAdminFns.updatePlatformStaffProfile),
    removePlatformStaff: useMutation(platformAdminFns.removePlatformStaff),
    updatePartnerPortalConfig: useMutation(platformAdminFns.updatePartnerPortalConfig),
    getPlatformPartnerShopSettings: useAction(
      platformAdminFns.getPlatformPartnerShopSettings
    ),
    savePlatformPartnerShopSettings: useAction(
      platformAdminFns.savePlatformPartnerShopSettings
    ),
  };
}
