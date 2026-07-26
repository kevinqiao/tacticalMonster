import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { ConvexHttpClient } from "convex/browser";
import { useTranslation } from "react-i18next";

import { PageProp } from "host/RenderApp";
import { markPortalBootPainted } from "@/host/bootHandoff";
import { usePartnerManager } from "host/service/PartnerManager";
import { registerConvexAuthClient } from "host/service/platformAuth/convexAuthRegistry";
import { parsePortalPathFromPathname } from "@/host/util/portalPathParse";
import {
  isGameEnabledForPartner,
  isRegisteredPartnerGameType,
} from "@/convex/sso/convex/service/partner/portalPartnerConfig";
import { partnerHasPortalGames } from "@/convex/sso/convex/service/partner/partnerCapabilities";

import PortalGame3DPage from "./3d/PortalGame3DPage";
import {
  PortalLobbyProvider,
  type PortalLobbyView,
} from "./PortalLobbyContext";
import { portalTournamentFns } from "./service/portalConvexFunctionRefs";
import {
  isValidPortalGameType,
  PORTAL_CONVEX_URL,
  PortalProvider,
  type RegisteredPartnerGameType,
} from "./service/usePortalManager";
import { PortalDocumentStylesProvider } from "./usePortalDocumentStyles";

let portalLobbyHttp: ConvexHttpClient | null = null;

function portalLobbyClient(): ConvexHttpClient {
  if (!portalLobbyHttp) {
    portalLobbyHttp = new ConvexHttpClient(PORTAL_CONVEX_URL);
    registerConvexAuthClient(portalLobbyHttp);
  }
  return portalLobbyHttp;
}

/**
 * Portal entry gate:
 * - /gc/{gameType}                      → first-party game
 * - /gc/{partnerSlug}                   → default lobby
 * - /gc/{partnerSlug}/{lobbySlug}       → named lobby
 * - /gc/{partnerSlug}/{gameType}        → game deep link
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
            gameType: null,
            isFirstPartyPortal: false,
            isLobbyPath: false,
          },
    // Re-parse when partner resolve flips (location may have settled).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [partnerResolveReady, portalPartnerSlug]
  );

  const raw = data?.gameType ?? data?.params?.gameType ?? portalPath.gameType;
  const gameTypeRaw = typeof raw === "string" ? raw : "";
  const pathGameType = isValidPortalGameType(gameTypeRaw) ? gameTypeRaw : null;
  const isLobbyPath = portalPath.isLobbyPath || (!pathGameType && (isFirstPartyPortal || Boolean(portalPartnerSlug)));

  const isPartnerSlugPath = Boolean(portalPartnerSlug) && !isFirstPartyPortal;
  const needsPartnerGate = isFirstPartyPortal || isPartnerSlugPath;

  const resolving = needsPartnerGate && !partnerResolveReady;
  const partnerMissing = isPartnerSlugPath && partnerResolveReady && !partner;
  const portalCapabilityOff =
    needsPartnerGate &&
    partnerResolveReady &&
    !!partner &&
    !partnerHasPortalGames(partner);

  const gameNotAllowed =
    needsPartnerGate &&
    partnerResolveReady &&
    !!partner &&
    !!pathGameType &&
    partnerHasPortalGames(partner) &&
    !isGameEnabledForPartner(partner, pathGameType);

  const [lobby, setLobby] = useState<PortalLobbyView | null>(null);
  const [lobbyLoading, setLobbyLoading] = useState(false);
  const [lobbyError, setLobbyError] = useState(false);

  useEffect(() => {
    if (resolving || partnerMissing || portalCapabilityOff) return;
    if (!needsPartnerGate && !isFirstPartyPortal) return;
    if (partnerResolveReady && needsPartnerGate && !partner && !isFirstPartyPortal) return;

    let cancelled = false;
    setLobbyLoading(true);
    setLobbyError(false);
    const games =
      partner?.games?.filter((g): g is string => typeof g === "string") ??
      undefined;
    void portalLobbyClient()
      .mutation(portalTournamentFns.resolvePortalLobby, {
        partnerId: isFirstPartyPortal ? 0 : partnerPid,
        lobbySlug: portalPath.lobbySlug ?? undefined,
        games,
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

  const effectiveGameType: RegisteredPartnerGameType | null = useMemo(() => {
    if (pathGameType && !gameNotAllowed) return pathGameType;
    if (!lobby) return null;
    const fromSolo = lobby.offerings.find((o) => o.matchType === "solo_p75")?.gameType;
    if (fromSolo && isValidPortalGameType(fromSolo)) return fromSolo;
    const first = lobby.derivedGames[0];
    if (first && isValidPortalGameType(first)) return first;
    if (first && isRegisteredPartnerGameType(first)) {
      return first as RegisteredPartnerGameType;
    }
    return null;
  }, [pathGameType, gameNotAllowed, lobby]);

  const gateBlocked =
    !resolving &&
    !lobbyLoading &&
    (partnerMissing ||
      portalCapabilityOff ||
      gameNotAllowed ||
      lobbyError ||
      (!pathGameType && !isLobbyPath) ||
      (isLobbyPath && !lobby) ||
      (!effectiveGameType && !isLobbyPath));

  useLayoutEffect(() => {
    if (gateBlocked) markPortalBootPainted();
  }, [gateBlocked]);

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

  const showLoading = resolving || lobbyLoading;

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
      ) : gameNotAllowed ? (
        <p className="merchant-note" style={gateMessageStyle} role="alert">
          {t("gate.gameNotOpen")}
        </p>
      ) : lobbyError || (isLobbyPath && !lobby) ? (
        <p className="merchant-note" style={gateMessageStyle} role="alert">
          {t("gate.unknownLobby", { defaultValue: "Lobby not found." })}
        </p>
      ) : !effectiveGameType && !lobby ? (
        <p className="merchant-note" style={gateMessageStyle} role="alert">
          {t("gate.unknownGame")}
        </p>
      ) : (
        <PortalLobbyProvider lobby={lobby} lobbySlug={portalPath.lobbySlug}>
          <PortalProvider
            gameType={effectiveGameType}
            lobbyId={lobby?.lobbyId ?? null}
            lobbySlug={lobby?.slug ?? portalPath.lobbySlug}
          >
            <PortalGame3DPage visible={visible} />
          </PortalProvider>
        </PortalLobbyProvider>
      )}
    </PortalDocumentStylesProvider>
  );
};

export default PortalGamePage;
