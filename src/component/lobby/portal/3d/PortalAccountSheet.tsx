import React from "react";
import { useTranslation } from "react-i18next";

import { useAudio } from "host/service/audio";
import { useUserManager } from "host/service/UserManager";

import { PortalCenterModal } from "../PortalCenterModal";
import { shouldShowPortalAuthMenuActions } from "../portalAuthButtonVisible";
import { usePortal } from "../service/usePortalManager";
import { PortalAccountPanel } from "./PortalAccountPanel";
import { PortalBackpackPanel } from "./PortalBackpackPanel";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Optional note toast (Portal 3D). */
  onFeedback?: (message: string) => void;
  /** Override sign-out; defaults to UserManager logout. */
  onSignOut?: () => void;
  /** Show Sign Out in the sheet header (left of title). */
  showSignOut?: boolean;
};

/**
 * Shared account modal (profile + vouchers) for Portal 3D and Campaign landing.
 * Must render under PortalProvider.
 * Campaign callers should wrap with PortalDocumentStylesProvider.
 */
export const PortalAccountSheet: React.FC<Props> = ({
  open,
  onClose,
  onFeedback,
  onSignOut,
  showSignOut,
}) => {
  const { t } = useTranslation("portal.player");
  const { user, logout, cancelAuth } = useUserManager();
  const { muted, toggleMuted } = useAudio();
  const portal = usePortal();
  const allowSignOut =
    showSignOut ?? shouldShowPortalAuthMenuActions();

  const signOut = () => {
    onClose();
    if (onSignOut) {
      onSignOut();
      return;
    }
    cancelAuth();
    void logout();
  };

  return (
    <PortalCenterModal
      open={open}
      title={t("lobby.accountMenu.myAccount")}
      onClose={onClose}
      headerStart={
        allowSignOut ? (
          <button
            type="button"
            className="portal-modal-signOut"
            onClick={signOut}
            aria-label={t("lobby.signOut")}
          >
            {t("lobby.signOut")}
          </button>
        ) : undefined
      }
    >
      <div className="portal-account-shell">
        <PortalAccountPanel
          uid={user?.uid}
          ssoName={user?.name}
          email={user?.email}
          phone={user?.phone}
          verifiedEmail={
            portal.playerProfile?.verifiedEmail ??
            portal.shopCatalog?.redemptionProfile?.verifiedEmail
          }
          verifiedPhone={
            portal.playerProfile?.verifiedPhone ??
            portal.shopCatalog?.redemptionProfile?.verifiedPhone
          }
          customDisplayName={portal.playerProfile?.displayName}
          resolvedDisplayName={portal.playerProfile?.resolvedDisplayName}
          onSaveDisplayName={portal.updatePortalDisplayName}
          onSaveContact={portal.syncRedemptionProfile}
          onFeedback={onFeedback}
          onSaved={onClose}
        />
        <section className="portal-account-shell__section">
          <h3 className="portal-account-shell__section-title">Sound</h3>
          <label className="portal-account-shell__mute-row">
            <span>Mute sound effects</span>
            <input
              type="checkbox"
              checked={muted}
              onChange={() => {
                toggleMuted();
              }}
            />
          </label>
        </section>
        <section className="portal-account-shell__section">
          <h3 className="portal-account-shell__section-title">
            {t("lobby.accountMenu.vouchers")}
          </h3>
          <PortalBackpackPanel
            backpackItems={portal.backpackItems}
            onCancelUse={portal.cancelUseBackpackVoucher}
          />
        </section>
      </div>
    </PortalCenterModal>
  );
};
