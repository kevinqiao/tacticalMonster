import { api } from "@/convex/sso/convex/_generated/api";
import { useAction, useMutation, useQuery } from "convex/react";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { useUserManager } from "host/service/UserManager";
import { useEffect, useState } from "react";

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
  getPartnerPortalConfig:
    api.service.partner.platformPartnerGcOpsAdmin.getPartnerPortalConfig,
  updatePartnerPortalConfig:
    api.service.partner.platformPartnerGcOpsAdmin.updatePartnerPortalConfig,
  getPlatformPartnerShopSettings:
    api.service.partner.platformPartnerShopAdmin.getPlatformPartnerShopSettings,
  savePlatformPartnerShopSettings:
    api.service.partner.platformPartnerShopAdmin.savePlatformPartnerShopSettings,
  clearPlatformPartnerLobbyShopOverlay:
    api.service.partner.platformPartnerShopAdmin.clearPlatformPartnerLobbyShopOverlay,
  listPlatformPartnerLobbies:
    api.service.partner.platformPartnerLobbyAdmin.listPlatformPartnerLobbies,
  upsertPlatformPartnerLobby:
    api.service.partner.platformPartnerLobbyAdmin.upsertPlatformPartnerLobby,
  deletePlatformPartnerLobby:
    api.service.partner.platformPartnerLobbyAdmin.deletePlatformPartnerLobby,
  getPlatformStatus: api.service.partner.platformStatus.getPlatformStatus,
  getPlatformStatusAdmin: api.service.partner.platformStatus.getPlatformStatusAdmin,
  setPlatformStatus: api.service.partner.platformStatus.setPlatformStatus,
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

export type PlatformStatus = {
  mode: "normal" | "pre_notice" | "maintenance";
  title: string;
  message: string;
  plannedStartAt: number | null;
  plannedEndAt: number | null;
  updatedAt: number;
  updatedBy: string | null;
};

export function usePlatformStatusAdmin(enabled: boolean) {
  const { authed } = usePlatformAdminAuth();
  return useQuery(
    platformAdminFns.getPlatformStatusAdmin,
    authed && enabled ? {} : "skip"
  ) as PlatformStatus | undefined;
}

export type PartnerPortalConfig = {
  partnerId: number;
  partnerSlug: string;
  games: string[];
  isFirstParty: boolean;
  capabilities: { portalGames?: boolean; campaignOps?: boolean };
  lobbyUrl: string;
  launchUrls: string[];
  registryGames: string[];
  adReplayDailyCap: number | null;
  adReplayDailyCapEffective: number | null;
  adReplayDailyCapDefault: number | null;
  maxReplaysPerMatch: number | null;
  maxReplaysPerMatchEffective: number;
  maxReplaysPerMatchDefault: number;
  adReplayEnabled: boolean;
  ticketReplayEnabled: boolean;
  ticketReplayPriceTickets: number | null;
  ticketReplayPriceTicketsEffective: number;
  freePlaySoloDailyCap: number | null;
  freePlayMultiDailyCap: number | null;
  quotaScope: "mode" | "lobby" | "tournament" | null;
  adEntryEnabled: boolean | null;
  adEntrySoloDailyCap: number | null;
  adEntryMultiDailyCap: number | null;
  ticketEntryEnabled: boolean | null;
  ticketEntrySoloPriceTickets: number | null;
  ticketEntrySoloDailyCap: number | null;
  ticketEntryMultiPriceTickets: number | null;
  ticketEntryMultiDailyCap: number | null;
  lobbyOpsMode: "isolated" | "shared" | null;
  lobbyOpsModeEffective: "isolated" | "shared";
  /** Partner 赛季日历起点 w:YYYY-MM-DD；null=用全站缺省 */
  seasonEpochWeekKey: string | null;
  seasonEpochWeekKeyEffective: string | null;
};

/**
 * Portal GC ops SoT is fetched via SSO action (not a live query).
 * `undefined` = loading; `null` = missing / forbidden.
 */
export function usePartnerPortalConfig(partnerId: number | null) {
  const { authed } = usePlatformAdminAuth();
  const getPartnerPortalConfig = useAction(platformAdminFns.getPartnerPortalConfig);
  const [config, setConfig] = useState<PartnerPortalConfig | null | undefined>(undefined);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setConfig(undefined);
    setReloadToken(0);
  }, [partnerId]);

  useEffect(() => {
    if (!authed || partnerId == null) {
      setConfig(undefined);
      return;
    }
    let cancelled = false;
    void getPartnerPortalConfig({ partnerId })
      .then((row) => {
        if (!cancelled) setConfig((row as PartnerPortalConfig | null) ?? null);
      })
      .catch(() => {
        if (!cancelled) setConfig(null);
      });
    return () => {
      cancelled = true;
    };
  }, [authed, partnerId, getPartnerPortalConfig, reloadToken]);

  return {
    config,
    reload: () => setReloadToken((n) => n + 1),
  };
}

export function usePlatformAdminMutations() {
  return {
    createPartner: useMutation(platformAdminFns.createPartner),
    deletePartner: useMutation(platformAdminFns.deletePartner),
    updatePartnerCapabilities: useMutation(platformAdminFns.updatePartnerCapabilities),
    addPlatformStaff: useAction(platformAdminFns.addPlatformStaff),
    updatePlatformStaffProfile: useAction(platformAdminFns.updatePlatformStaffProfile),
    removePlatformStaff: useMutation(platformAdminFns.removePlatformStaff),
    updatePartnerPortalConfig: useAction(platformAdminFns.updatePartnerPortalConfig),
    getPlatformPartnerShopSettings: useAction(
      platformAdminFns.getPlatformPartnerShopSettings
    ),
    savePlatformPartnerShopSettings: useAction(
      platformAdminFns.savePlatformPartnerShopSettings
    ),
    clearPlatformPartnerLobbyShopOverlay: useAction(
      platformAdminFns.clearPlatformPartnerLobbyShopOverlay
    ),
    listPlatformPartnerLobbies: useAction(
      platformAdminFns.listPlatformPartnerLobbies
    ),
    upsertPlatformPartnerLobby: useAction(
      platformAdminFns.upsertPlatformPartnerLobby
    ),
    deletePlatformPartnerLobby: useAction(
      platformAdminFns.deletePlatformPartnerLobby
    ),
    setPlatformStatus: useMutation(platformAdminFns.setPlatformStatus),
  };
}
