import { api } from "@/convex/sso/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { useUserManager } from "host/service/UserManager";

export const partnerAdminFns = {
  listMyPartners: api.service.partner.partnerAdmin.listMyPartners,
  getPartnerAdminDetail: api.service.partner.partnerAdmin.getPartnerAdminDetail,
  updatePartnerProfile: api.service.partner.partnerAdmin.updatePartnerProfile,
  updatePartnerAuthChannels: api.service.partner.partnerAdmin.updatePartnerAuthChannels,
  updatePartnerStaffAuthChannels: api.service.partner.partnerAdmin.updatePartnerStaffAuthChannels,
  listAuthChannelCatalog: api.service.partner.partnerAdmin.listAuthChannelCatalog,
  listPartnerTeam: api.service.partner.partnerAdmin.listPartnerTeam,
  addPartnerStaff: api.service.partner.staffAccountActions.addPartnerStaff,
  removePartnerStaff: api.service.partner.partnerAdmin.removePartnerStaff,
  getPartnerPortalConfig: api.service.partner.partnerAdmin.getPartnerPortalConfig,
  updatePartnerPortalConfig: api.service.partner.partnerAdmin.updatePartnerPortalConfig,
};

export function usePartnerAdminAuth() {
  const { user } = useUserManager();
  return {
    user,
    authed: isPlatformAuthed(user),
  };
}

export function useMyPartners() {
  const { authed } = usePartnerAdminAuth();
  return useQuery(partnerAdminFns.listMyPartners, authed ? {} : "skip");
}

export function usePartnerDetail(partnerId: number | null) {
  const { authed } = usePartnerAdminAuth();
  return useQuery(
    partnerAdminFns.getPartnerAdminDetail,
    authed && partnerId ? { partnerId } : "skip"
  );
}

export function useAuthChannelCatalog() {
  const { authed } = usePartnerAdminAuth();
  return useQuery(partnerAdminFns.listAuthChannelCatalog, authed ? {} : "skip");
}

export function usePartnerTeam(partnerId: number | null) {
  const { authed } = usePartnerAdminAuth();
  return useQuery(
    partnerAdminFns.listPartnerTeam,
    authed && partnerId ? { partnerId } : "skip"
  );
}

export function usePartnerPortalConfig(partnerId: number | null) {
  const { authed } = usePartnerAdminAuth();
  return useQuery(
    partnerAdminFns.getPartnerPortalConfig,
    authed && partnerId ? { partnerId } : "skip"
  );
}

export function usePartnerAdminMutations() {
  return {
    updatePartnerProfile: useMutation(partnerAdminFns.updatePartnerProfile),
    updatePartnerAuthChannels: useMutation(partnerAdminFns.updatePartnerAuthChannels),
    updatePartnerStaffAuthChannels: useMutation(partnerAdminFns.updatePartnerStaffAuthChannels),
    addPartnerStaff: useAction(partnerAdminFns.addPartnerStaff),
    removePartnerStaff: useMutation(partnerAdminFns.removePartnerStaff),
    updatePartnerPortalConfig: useMutation(partnerAdminFns.updatePartnerPortalConfig),
  };
}

