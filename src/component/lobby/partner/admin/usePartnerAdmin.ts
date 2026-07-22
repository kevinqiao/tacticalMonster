import { api } from "@/convex/sso/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { useUserManager } from "host/service/UserManager";

export const partnerAdminFns = {
  listMyPartners: api.service.partner.partnerAdmin.listMyPartners,
  getPartnerAdminDetail: api.service.partner.partnerAdmin.getPartnerAdminDetail,
  updatePartnerProfile: api.service.partner.partnerAdmin.updatePartnerProfile,
  updatePartnerPlayerAuth: api.service.partner.partnerAdmin.updatePartnerPlayerAuth,
  updatePartnerStaffAuth: api.service.partner.partnerAdmin.updatePartnerStaffAuth,
  listPartnerTeam: api.service.partner.partnerAdmin.listPartnerTeam,
  addPartnerStaff: api.service.partner.staffAccountActions.addPartnerStaff,
  updatePartnerStaffProfile: api.service.partner.staffAccountActions.updatePartnerStaffProfile,
  removePartnerStaff: api.service.partner.partnerAdmin.removePartnerStaff,
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

export function usePartnerTeam(partnerId: number | null) {
  const { authed } = usePartnerAdminAuth();
  return useQuery(
    partnerAdminFns.listPartnerTeam,
    authed && partnerId ? { partnerId } : "skip"
  );
}

export function usePartnerAdminMutations() {
  return {
    updatePartnerProfile: useMutation(partnerAdminFns.updatePartnerProfile),
    updatePartnerPlayerAuth: useMutation(partnerAdminFns.updatePartnerPlayerAuth),
    updatePartnerStaffAuth: useMutation(partnerAdminFns.updatePartnerStaffAuth),
    addPartnerStaff: useAction(partnerAdminFns.addPartnerStaff),
    updatePartnerStaffProfile: useAction(partnerAdminFns.updatePartnerStaffProfile),
    removePartnerStaff: useMutation(partnerAdminFns.removePartnerStaff),
  };
}

