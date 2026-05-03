import { findContainer, getURLParams } from "@/host/util/PageUtils";
import { useModalManager } from "host/service/ModalManager";
import { User, useUserManager } from "host/service/UserManager";
import React, { lazy, Suspense, useCallback, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { usePageManager } from "../service/PageManager";
import { PANELS } from "./config";
import "./signin.css";
import { useAuthAnimate } from "./useAuthAnimate";

/** 须高于 LobbyHome 顶/底栏（z-index 5200）与 Head 汉堡菜单（约 5300），否则登录层留在 #root 内无法盖住 body 上的 chrome */
const SSO_LAYER_Z = 6000;

export interface AuthProvider {
  partnerId: number;
  app: string;
  name: string;
  path: string;
  channelId: number;
}
export interface AuthInit {
  open: number;
  // cancelPage: PageItem | null;
  cancel: () => void;
}

export interface AuthProps {
  onLoad: () => void;
}
export interface AuthContainer {
  ele?: HTMLDivElement | null;
  mask?: HTMLDivElement | null;
  closeEle?: HTMLDivElement | null;
}
const PANEL_LOADERS: Record<
  string,
  () => Promise<{ default: React.ComponentType<{ onComplete: (user: User) => void }> }>
> = {
  "panels/WebPanel1": () => import("./panels/WebPanel1"),
  "panels/WebPanel2": () => import("./panels/WebPanel2"),
};

const SSOController: React.FC = () => {
  const { pageContainers, currentPage, sumbitPage } = usePageManager();
  const { submitModal } = useModalManager();
  const { user, cancelAuth, authComplete } = useUserManager();
  const authContainer = useMemo(() => {
    return {
      ele: null,
      mask: null,
      closeEle: null
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
    if (user.uid) return 0;
    const container = currentPage ? findContainer(pageContainers, currentPage.uri) : null;
    return container?.auth === 1 ? 2 : user.authReq ? 1 : 0;
  }, [user, currentPage, pageContainers]);

  const { playOpen, playClose } = useAuthAnimate({ container: authContainer });


  const onCancel = useCallback(() => {
    if (authLevel < 2) {
      playClose({
        onComplete: () => {
          cancelAuth();
          console.log("onClose finished")
        }
      });
    }

  }, [cancelAuth, playClose, authLevel]);
  const onSuccess = useCallback(
    (u: User) => {
      playClose({
        onComplete: () => {
          if (user && user.authReq) {
            if (user.authReq.page)
              sumbitPage(user.authReq.page);
            if (user.authReq.modal)
              submitModal(user.authReq.modal);
          }
          authComplete(u, 1);
        },
      });
    },
    [playClose, authComplete, sumbitPage, user]
  );

  useEffect(() => {
    if (authLevel > 0) {
      playOpen({ closeAble: authLevel < 2, onComplete: () => console.log("playOpen finished") });
    }
  }, [authContainer, playOpen, authLevel]);

  const layer = useMemo(
    () => {
      return <>
        <div ref={(ele) => authContainer.mask = ele} style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: SSO_LAYER_Z,
          width: "100%",
          height: "100%",
          backgroundColor: "black",
          overflow: "hidden",
          pointerEvents: "auto",
          opacity: 0,
          visibility: "hidden",
        }} onClick={onCancel} >
        </div>

        <div
          ref={(ele) => authContainer.ele = ele}
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            zIndex: SSO_LAYER_Z + 1,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            overflow: "hidden",
            opacity: 0,
            visibility: "hidden",
          }}
        >
          {SelectedComponent && (
            <Suspense fallback={<div />}>
              <SelectedComponent key={panelConfig?.path} onComplete={onSuccess} />
            </Suspense>
          )}
          <div ref={(ele) => authContainer.closeEle = ele} style={{ position: "absolute", top: 0, left: 0, width: "40px", height: "40px", backgroundColor: "red", pointerEvents: "auto", opacity: 0, visibility: "hidden" }} onClick={onCancel} />
        </div>
      </>
    }, [authContainer, onCancel, onSuccess]);



  if (typeof document !== "undefined" && document.body) {
    return createPortal(layer, document.body);
  }

  return null;
};

export default SSOController;
