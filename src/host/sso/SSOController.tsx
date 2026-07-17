import { parsePortalPathFromPathname } from "@/host/util/portalPathParse";
import { findContainer, getURLParams } from "@/host/util/PageUtils";
import { isStaffWebSignInContext } from "@/component/lobby/shared/resolveWebSignInFromLocation";
import { useModalManager } from "host/service/ModalManager";
import { useEmbedAuthGate } from "host/service/platformAuth/EmbedAuthGateProvider";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";
import { User, useUserManager } from "host/service/UserManager";
import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { usePageManager } from "../service/PageManager";
import { PANELS } from "./config";
import "./signin.css";
import { useAuthAnimate } from "./useAuthAnimate";

/** Lobby chrome ~5300. Staff must sit above BootLoadingOverlay (500000). */
const SSO_LAYER_Z_DEFAULT = 6000;
const SSO_LAYER_Z_STAFF = 600_000;

export interface AuthProvider {
  partnerId: number;
  app: string;
  name: string;
  path: string;
  channelId: number;
}
export interface AuthInit {
  open: number;
  cancel: () => void;
}

export interface AuthProps {
  onLoad: () => void;
}
export interface AuthContainer {
  ele?: HTMLDivElement | null;
  mask?: HTMLDivElement | null;
  closeEle?: HTMLButtonElement | null;
}
const PANEL_LOADERS: Record<
  string,
  () => Promise<{ default: React.ComponentType<{ onComplete: (user: User) => void; portalTheme?: boolean }> }>
> = {
  "panels/WebPanel1": () => import("./panels/WebPanel1"),
  "panels/WebPanel2": () => import("./panels/WebPanel2"),
};

const SSOController: React.FC = () => {
  const { pageContainers, currentPage, sumbitPage } = usePageManager();
  const { submitModal } = useModalManager();
  const { user, cancelAuth, authComplete } = useUserManager();
  const { deferClerk } = useEmbedAuthGate();
  const staffConsole = isStaffWebSignInContext();
  const ssoZ = staffConsole ? SSO_LAYER_Z_STAFF : SSO_LAYER_Z_DEFAULT;
  const authContainer = useMemo(() => {
    return {
      ele: null,
      mask: null,
      closeEle: null,
    } as AuthContainer;
  }, []);
  const panelConfig = useMemo(() => {
    const params: { [k: string]: string } = getURLParams(window.location);
    const pid = params.t || "1";
    const config = PANELS.find((p) => p.pid === pid);
    return config;
  }, []);
  const SelectedComponent = useMemo(() => {
    if (!panelConfig) return null;
    const load = PANEL_LOADERS[panelConfig.path];
    if (!load) {
      console.warn(`[SSOController] No panel loader for path "${panelConfig.path}"`);
      return null;
    }
    return lazy(load);
  }, [panelConfig]);
  const authLevel = useMemo(() => {
    if (!user) return -1;
    if (user.authReq) return 1;
    if (user.uid) return 0;
    const container = currentPage ? findContainer(pageContainers, currentPage.uri) : null;
    return container?.auth === 1 ? 2 : 0;
  }, [user, currentPage, pageContainers]);

  /** Embed handoff must never suppress staff-console SSO. */
  const effectiveAuthLevel = deferClerk && !staffConsole ? 0 : authLevel;
  const wantsAuth = Boolean(user?.authReq) || effectiveAuthLevel > 0;

  const isPortalRoute = useMemo(() => {
    const pathname =
      currentPage?.uri ?? (typeof window !== "undefined" ? window.location.pathname : "");
    return parsePortalPathFromPathname(pathname).isFirstPartyPortal;
  }, [currentPage]);

  const { playOpen, playClose } = useAuthAnimate({ container: authContainer });
  const wasPlatformAuthedRef = useRef(false);
  const onSuccessRef = useRef<(u: User) => void>(() => {});
  const onCancelRef = useRef<() => void>(() => {});

  useEffect(() => {
    const authed = isPlatformAuthed(user);
    // Staff: skip auto-close on session restore. It races with forceReauth→playOpen and
    // the close onComplete would hide the login form (platform → partner tab case).
    if (
      !staffConsole &&
      authed &&
      !wasPlatformAuthedRef.current &&
      !user?.authReq
    ) {
      playClose({});
    }
    wasPlatformAuthedRef.current = authed;
  }, [playClose, user, staffConsole]);

  const onCancel = useCallback(() => {
    // Staff required login cannot be dismissed.
    if (staffConsole || effectiveAuthLevel >= 2) return;
    playClose({
      onComplete: () => {
        cancelAuth();
      },
    });
  }, [cancelAuth, playClose, effectiveAuthLevel, staffConsole]);

  const onSuccess = useCallback(
    (u: User) => {
      const pendingAuthReq = user?.authReq;
      authComplete(u, 1);
      playClose({
        onComplete: () => {
          if (pendingAuthReq?.page) sumbitPage(pendingAuthReq.page);
          if (pendingAuthReq?.modal) submitModal(pendingAuthReq.modal);
        },
      });
    },
    [playClose, authComplete, sumbitPage, submitModal, user]
  );

  onSuccessRef.current = onSuccess;
  onCancelRef.current = onCancel;

  useLayoutEffect(() => {
    if (effectiveAuthLevel <= 0) return;
    let cancelled = false;
    const tryOpen = () => {
      if (cancelled) return;
      if (!authContainer.ele) {
        requestAnimationFrame(tryOpen);
        return;
      }
      // Staff consoles: required login — no dismiss (same as authLevel 2).
      playOpen({
        closeAble: !staffConsole && effectiveAuthLevel < 2,
        layout: staffConsole ? "staffFull" : "default",
      });
    };
    tryOpen();
    return () => {
      cancelled = true;
    };
  }, [authContainer, playOpen, effectiveAuthLevel, wantsAuth, staffConsole]);

  // Stable portal tree — avoid remounting the panel when onSuccess identity changes
  // (that left only the floating × visible while the slide panel stayed off-screen).
  const layer = (
    <>
      <div
        ref={(ele) => {
          authContainer.mask = ele;
        }}
        className={isPortalRoute ? "sso-auth-mask sso-auth-mask--portal" : "sso-auth-mask"}
        style={{ zIndex: ssoZ }}
        onClick={() => onCancelRef.current()}
      />

      <div
        ref={(ele) => {
          authContainer.ele = ele;
        }}
        className={isPortalRoute ? "sso-auth-layer sso-auth-layer--portal" : "sso-auth-layer"}
        style={{ zIndex: ssoZ + 1 }}
      >
        {isPortalRoute ? (
          <div className="sso-auth-head portal-modal-head">
            <h2 id="sso-auth-title">登录</h2>
          </div>
        ) : null}
        <div className={isPortalRoute ? "sso-auth-body portal-modal-body" : "sso-auth-body"}>
          {SelectedComponent && (
            <Suspense fallback={<div />}>
              <SelectedComponent
                key={panelConfig?.path}
                onComplete={(u) => onSuccessRef.current(u)}
                portalTheme={isPortalRoute}
              />
            </Suspense>
          )}
        </div>
      </div>
      <button
        ref={(ele) => {
          authContainer.closeEle = ele;
        }}
        type="button"
        className={
          isPortalRoute
            ? "portal-modal-close portal-modal-close--shell sso-auth-close"
            : "sso-auth-close sso-auth-close--floating"
        }
        style={{
          zIndex: ssoZ + 2,
          // Staff required login: keep node for GSAP refs but never show/click.
          ...(staffConsole ? { display: "none" } : null),
        }}
        aria-label="关闭"
        aria-hidden={staffConsole}
        tabIndex={staffConsole ? -1 : undefined}
        onClick={() => onCancelRef.current()}
      >
        ×
      </button>
    </>
  );

  if (typeof document !== "undefined" && document.body) {
    return createPortal(layer, document.body);
  }

  return null;
};

export default SSOController;
