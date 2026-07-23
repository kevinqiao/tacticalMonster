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
  listPartnerVouchers: api.service.partner.partnerPartnerVoucherAdmin.listPartnerVouchers,
  confirmPartnerVoucherUse: api.service.partner.partnerPartnerVoucherAdmin.confirmPartnerVoucherUse,
  rejectPartnerVoucherUse: api.service.partner.partnerPartnerVoucherAdmin.rejectPartnerVoucherUse,
  redeemPartnerVoucher: api.service.partner.partnerPartnerVoucherAdmin.redeemPartnerVoucher,
  voidPartnerVoucher: api.service.partner.partnerPartnerVoucherAdmin.voidPartnerVoucher,
  listPartnerShopSkus: api.service.partner.partnerPartnerShopSkuAdmin.listPartnerShopSkus,
  upsertPartnerShopSku: api.service.partner.partnerPartnerShopSkuAdmin.upsertPartnerShopSku,
  setPartnerShopSkuActive: api.service.partner.partnerPartnerShopSkuAdmin.setPartnerShopSkuActive,
  deletePartnerShopSku: api.service.partner.partnerPartnerShopSkuAdmin.deletePartnerShopSku,
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
  // PID 0 is valid (first-party); do not treat 0 as "missing".
  return useQuery(
    partnerAdminFns.getPartnerAdminDetail,
    authed && partnerId != null ? { partnerId } : "skip"
  );
}

export function usePartnerTeam(partnerId: number | null) {
  const { authed } = usePartnerAdminAuth();
  return useQuery(
    partnerAdminFns.listPartnerTeam,
    authed && partnerId != null ? { partnerId } : "skip"
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
    listPartnerVouchers: useAction(partnerAdminFns.listPartnerVouchers),
    confirmPartnerVoucherUse: useAction(partnerAdminFns.confirmPartnerVoucherUse),
    rejectPartnerVoucherUse: useAction(partnerAdminFns.rejectPartnerVoucherUse),
    redeemPartnerVoucher: useAction(partnerAdminFns.redeemPartnerVoucher),
    voidPartnerVoucher: useAction(partnerAdminFns.voidPartnerVoucher),
    listPartnerShopSkus: useAction(partnerAdminFns.listPartnerShopSkus),
    upsertPartnerShopSku: useAction(partnerAdminFns.upsertPartnerShopSku),
    setPartnerShopSkuActive: useAction(partnerAdminFns.setPartnerShopSkuActive),
    deletePartnerShopSku: useAction(partnerAdminFns.deletePartnerShopSku),
  };
}

