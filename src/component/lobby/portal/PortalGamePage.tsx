import React, { useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";

import { PageProp } from "host/RenderApp";
import { markPortalBootPainted } from "@/host/bootHandoff";
import { usePartnerManager } from "host/service/PartnerManager";
import { parsePortalPathFromPathname } from "@/host/util/portalPathParse";
import { isGameEnabledForPartner } from "@/convex/sso/convex/service/partner/portalPartnerConfig";
import { partnerHasPortalGames } from "@/convex/sso/convex/service/partner/partnerCapabilities";

import PortalGame3DPage from "./3d/PortalGame3DPage";
import {
  isValidPortalGameType,
  PortalProvider,
} from "./service/usePortalManager";
import { PortalDocumentStylesProvider } from "./usePortalDocumentStyles";

/**
 * Portal game entry gate:
 * - /portal/{gameType}           → first-party, partner pid=0.games
 * - /portal/{portal_key}/{game}  → partner resolved by portal_key → games
 */
const PortalGamePage: React.FC<PageProp> = ({ visible, data }) => {
  const { t } = useTranslation("portal.player");
  const { partner, partnerResolveReady, isFirstPartyPortal, portalPartnerKey } =
    usePartnerManager();
  const raw = data?.gameType ?? data?.params?.gameType;
  const fromPath =
    typeof window !== "undefined"
      ? parsePortalPathFromPathname(window.location.pathname).gameType ?? undefined
      : undefined;
  const gameTypeRaw = (typeof raw === "string" ? raw : fromPath) ?? "";
  const gameType = isValidPortalGameType(gameTypeRaw) ? gameTypeRaw : null;

  const isPartnerKeyPath = Boolean(portalPartnerKey) && !isFirstPartyPortal;
  /** Both first-party and partner-key portal URLs wait on partner resolve + games check. */
  const needsPartnerGate = isFirstPartyPortal || isPartnerKeyPath;

  const resolving = needsPartnerGate && !partnerResolveReady;
  const partnerMissing = isPartnerKeyPath && partnerResolveReady && !partner;
  const portalCapabilityOff =
    needsPartnerGate &&
    partnerResolveReady &&
    !!partner &&
    !partnerHasPortalGames(partner);
  const gameNotAllowed =
    needsPartnerGate &&
    partnerResolveReady &&
    !!partner &&
    !!gameType &&
    partnerHasPortalGames(partner) &&
    !isGameEnabledForPartner(partner, gameType);

  const partnerGateOk =
    !gameType ||
    !needsPartnerGate ||
    (partnerResolveReady &&
      !!partner &&
      partnerHasPortalGames(partner) &&
      isGameEnabledForPartner(partner, gameType));

  const effectiveGameType = gameType && partnerGateOk ? gameType : null;
  const gateBlocked =
    !resolving && (partnerMissing || portalCapabilityOff || !gameType || gameNotAllowed);

  // Error / unknown gates never mount the 3D lobby — release cold-boot overlay here.
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

  return (
    <PortalDocumentStylesProvider>
      {resolving ? (
        <p className="merchant-note" style={gateMessageStyle}>
          {t("gate.loading")}
        </p>
      ) : partnerMissing ? (
        <p className="merchant-note" style={gateMessageStyle} role="alert">
          {t("gate.unknownKey", { key: portalPartnerKey })}
        </p>
      ) : portalCapabilityOff ? (
        <p className="merchant-note" style={gateMessageStyle} role="alert">
          {t("gate.portalDisabled")}
        </p>
      ) : !gameType ? (
        <p className="merchant-note" style={gateMessageStyle} role="alert">
          {t("gate.unknownGame")}
        </p>
      ) : gameNotAllowed ? (
        <p className="merchant-note" style={gateMessageStyle} role="alert">
          {t("gate.gameNotOpen")}
        </p>
      ) : (
        <PortalProvider gameType={effectiveGameType}>
          <PortalGame3DPage visible={visible} />
        </PortalProvider>
      )}
    </PortalDocumentStylesProvider>
  );
};

export default PortalGamePage;
