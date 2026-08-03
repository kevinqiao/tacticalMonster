import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ConvexHttpClient } from "convex/browser";
import { useTranslation } from "react-i18next";

import { PageProp } from "host/RenderApp";
import { markPortalBootPainted } from "@/host/bootHandoff";
import { usePartnerManager } from "host/service/PartnerManager";
import { registerConvexAuthClient } from "host/service/platformAuth/convexAuthRegistry";
import { parsePortalPathFromPathname } from "@/host/util/portalPathParse";
import { isRegisteredPartnerGameType } from "@/convex/sso/convex/service/partner/portalPartnerConfig";
import { partnerHasPortalGames } from "@/convex/sso/convex/service/partner/partnerCapabilities";

import PortalGame3DPage from "./3d/PortalGame3DPage";
import {
  PortalLobbyProvider,
  type PortalLobbyView,
} from "./PortalLobbyContext";
import { hydratePortalRewardedAdMode } from "@/host/service/ads/rewarded/portalRewardedAdMode";
import { portalTournamentFns } from "./service/portalConvexFunctionRefs";
import {
  isValidPortalGameType,
  PORTAL_CONVEX_URL,
  PortalProvider,
  type RegisteredPartnerGameType,
} from "./service/usePortalManager";
import { PortalDocumentStylesProvider } from "./usePortalDocumentStyles";

let portalLobbyHttp: ConvexHttpClient | null = null;
let rewardedAdModeHydrateStarted = false;

function portalLobbyClient(): ConvexHttpClient {
  if (!portalLobbyHttp) {
    portalLobbyHttp = new ConvexHttpClient(PORTAL_CONVEX_URL);
    registerConvexAuthClient(portalLobbyHttp);
  }
  return portalLobbyHttp;
}

/** Pull idle|live — drives mock vs real ads without rebuild. Retries once on failure. */
function ensureRewardedAdModeHydrated(): void {
  if (rewardedAdModeHydrateStarted) return;
  rewardedAdModeHydrateStarted = true;
  const fetchMode = () =>
    portalLobbyClient().query(portalTournamentFns.getPortalRewardedAdMode, {});
  void hydratePortalRewardedAdMode(fetchMode).then((mode) => {
    if (mode != null) return;
    rewardedAdModeHydrateStarted = false;
    window.setTimeout(() => {
      if (rewardedAdModeHydrateStarted) return;
      ensureRewardedAdModeHydrated();
    }, 1500);
  });
}

/**
 * Portal entry gate (lobby-only):
 * - /gc                                 → first-party default lobby
 * - /gc/{partnerSlug}                   → partner default lobby
 * - /gc/{partnerSlug}/{lobbySlug}       → named lobby
 */
const PortalGamePage: React.FC<PageProp> = ({ visible, data }) => {
  const { t } = useTranslation("portal.player");
  const { partner, partnerResolveReady, isFirstPartyPortal, portalPartnerSlug, partnerPid } =
    usePartnerManager();

  const portalPath = useMemo(
    () =>
      typeof window !== "undefined"
        ? parsePortalPathFromPathname(window.location.pathname)
        : {
            partnerSlug: null,
            partnerKey: null,
            lobbySlug: null,
            isFirstPartyPortal: false,
            isLobbyPath: false,
          },
    // Re-parse when partner resolve flips (location may have settled).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [partnerResolveReady, portalPartnerSlug]
  );

  // Optional page data override only (no URL game deep links).
  const raw = data?.gameType ?? data?.params?.gameType;
  const gameTypeRaw = typeof raw === "string" ? raw : "";
  const pathGameType = isValidPortalGameType(gameTypeRaw) ? gameTypeRaw : null;
  const isLobbyPath =
    portalPath.isLobbyPath || isFirstPartyPortal || Boolean(portalPartnerSlug);

  const isPartnerSlugPath = Boolean(portalPartnerSlug) && !isFirstPartyPortal;
  const needsPartnerGate = isFirstPartyPortal || isPartnerSlugPath;

  const resolving = needsPartnerGate && !partnerResolveReady;
  const partnerMissing = isPartnerSlugPath && partnerResolveReady && !partner;
  const portalCapabilityOff =
    needsPartnerGate &&
    partnerResolveReady &&
    !!partner &&
    !partnerHasPortalGames(partner);

  const [lobby, setLobby] = useState<PortalLobbyView | null>(null);
  const [lobbyLoading, setLobbyLoading] = useState(false);
  const [lobbyError, setLobbyError] = useState(false);

  useEffect(() => {
    ensureRewardedAdModeHydrated();
  }, []);

  useEffect(() => {
    if (resolving || partnerMissing || portalCapabilityOff) return;
    if (!needsPartnerGate && !isFirstPartyPortal) return;
    if (partnerResolveReady && needsPartnerGate && !partner && !isFirstPartyPortal) return;

    ensureRewardedAdModeHydrated();

    let cancelled = false;
    setLobbyLoading(true);
    setLobbyError(false);
    void portalLobbyClient()
      .mutation(portalTournamentFns.resolvePortalLobby, {
        partnerId: isFirstPartyPortal ? 0 : partnerPid,
        lobbySlug: portalPath.lobbySlug ?? undefined,
      })
      .then((row) => {
        if (cancelled) return;
        if (!row) {
          setLobby(null);
          setLobbyError(true);
        } else {
          setLobby(row as PortalLobbyView);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLobby(null);
          setLobbyError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLobbyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    resolving,
    partnerMissing,
    portalCapabilityOff,
    needsPartnerGate,
    isFirstPartyPortal,
    partner,
    partnerPid,
    partnerResolveReady,
    portalPath.lobbySlug,
  ]);

  /**
   * Pin a gameType only for single-game lobbies (directPlayHome) or page override.
   * Multi-game lobbies keep null — never invent from "first solo offering".
   */
  const effectiveGameType: RegisteredPartnerGameType | null = useMemo(() => {
    if (pathGameType) return pathGameType;
    if (!lobby) return null;
    if (lobby.directPlayHome && lobby.derivedGames.length === 1) {
      const only = lobby.derivedGames[0];
      if (only && isValidPortalGameType(only)) return only;
      if (only && isRegisteredPartnerGameType(only)) {
        return only as RegisteredPartnerGameType;
      }
    }
    return null;
  }, [pathGameType, lobby]);

  /** Empty / unresolvable lobby → same UX as not found (do not guess a game). */
  const lobbyUnusable =
    Boolean(lobby) &&
    (lobby!.offerings.length === 0 ||
      lobby!.derivedGames.length === 0 ||
      (lobby!.directPlayHome && !effectiveGameType));

  const lobbyNotFound =
    lobbyError || (isLobbyPath && !lobby) || lobbyUnusable;

  const gateBlocked =
    !resolving &&
    !lobbyLoading &&
    (partnerMissing ||
      portalCapabilityOff ||
      lobbyNotFound ||
      (!pathGameType && !isLobbyPath));

  const showLoading = resolving || lobbyLoading;

  // Dismiss boot cover once lobby gate settles — do not wait for page `visible`
  // (GSAP pageOpen). On CrazyGames, visible can lag while assets already failed
  // under a retargeted <base>, leaving "Entering game lobby…" forever.
  useLayoutEffect(() => {
    if (showLoading) return;
    if (gateBlocked || (lobby && !lobbyUnusable)) {
      markPortalBootPainted();
    }
  }, [showLoading, gateBlocked, lobby, lobbyUnusable]);

  useLayoutEffect(() => {
    const root = document.getElementById("root");
    if (root) {
      const oldBg = root.style.backgroundColor;
      root.style.backgroundColor = "transparent";
      return () => {
        root.style.backgroundColor = oldBg;
      };
    }
  }, []);

  const gateMessageStyle: React.CSSProperties = {
    padding: 24,
    textAlign: "center",
    fontSize: 18,
    color: "#f5f5f5",
  };

  return (
    <PortalDocumentStylesProvider>
      {showLoading ? (
        <p className="merchant-note" style={gateMessageStyle}>
          {t("gate.loading")}
        </p>
      ) : partnerMissing ? (
        <p className="merchant-note" style={gateMessageStyle} role="alert">
          {t("gate.unknownKey", { key: portalPartnerSlug })}
        </p>
      ) : portalCapabilityOff ? (
        <p className="merchant-note" style={gateMessageStyle} role="alert">
          {t("gate.portalDisabled")}
        </p>
      ) : lobbyNotFound ? (
        <p className="merchant-note" style={gateMessageStyle} role="alert">
          {t("gate.unknownLobby", { defaultValue: "Lobby not found." })}
        </p>
      ) : lobby ? (
        <PortalLobbyProvider
          lobby={lobby}
          lobbySlug={lobby.slug ?? portalPath.lobbySlug}
        >
          <PortalProvider
            gameType={effectiveGameType}
            lobbyId={lobby.lobbyId}
            lobbySlug={lobby.slug ?? portalPath.lobbySlug}
          >
            <PortalGame3DPage visible={visible} />
          </PortalProvider>
        </PortalLobbyProvider>
      ) : (
        <p className="merchant-note" style={gateMessageStyle} role="alert">
          {t("gate.unknownLobby", { defaultValue: "Lobby not found." })}
        </p>
      )}
    </PortalDocumentStylesProvider>
  );
};

export default PortalGamePage;
