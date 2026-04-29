import { ModalContainer, ModalItem, ModalProp, useModalManager } from "@/service/ModalManager";
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import "./render.css";
import { useModalAnimate } from "./shell/useModalAnimate";

const MODAL_Z_BASE = 200000;

const isStaleChunkError = (error: unknown): boolean => {
  const msg = String((error as Error)?.message ?? error ?? "");
  return /Failed to fetch dynamically imported module|Loading chunk [\w-]+ failed|Importing a module script failed/i.test(msg);
};

const RELOAD_META_KEY = "__viteDynamicImportReloadMetaV2";

const getChunkIdFromError = (error: unknown): string => {
  const msg = String((error as Error)?.message ?? error ?? "");
  const abs = msg.match(/https?:\/\/[^\s'")]+\.js/i)?.[0];
  if (abs) return abs;
  const rel = msg.match(/assets\/[^\s'")]+\.js/i)?.[0];
  if (rel) return rel;
  return msg.slice(0, 160);
};

const tryReloadForStaleChunk = (error: unknown): boolean => {
  try {
    if (typeof sessionStorage === "undefined") return false;
    const now = Date.now();
    const chunkId = getChunkIdFromError(error);
    const raw = sessionStorage.getItem(RELOAD_META_KEY);
    if (raw) {
      const prev = JSON.parse(raw) as { chunkId?: string; at?: number };
      if (prev.chunkId === chunkId && typeof prev.at === "number" && now - prev.at < 15000) {
        return false;
      }
    }
    sessionStorage.setItem(RELOAD_META_KEY, JSON.stringify({ chunkId, at: now }));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
};

// 组件路径映射 - 静态映射所有可能的组件
const componentMap: Record<string, () => Promise<any>> = {
  './battle/PlayTournament': () => import('./battle/PlayTournament'),
  './lobby/tournament/TournamentJoinList': () => import('./lobby/tournament/TournamentJoinList'),
  './lobby/tournament/TournamentHistory': () => import('./lobby/tournament/TournamentHistory'),
  './battle/games/solitaireSolo/battle/PlaySolitaireSolo': () => import('./battle/games/solitaireSolo/battle/PlaySolitaireSolo'),
  './battle/games/blockBlast/battle/PlayBlockBlast': () => import('./battle/games/blockBlast/battle/PlayBlockBlast'),
};

// 错误边界组件
const ErrorComponent: React.FC<{ path: string; error?: Error }> = ({ path, error }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    color: '#666'
  }}>
    <h3>Component Load Error</h3>
    <p>Failed to load: {path}</p>
    {error && <p>Error: {error.message}</p>}
    <button onClick={() => window.location.reload()}>Reload Page</button>
  </div>
);
const ComponentCache = new Map<string, React.ComponentType<ModalProp>>();
const getCachedComponent = (path: string): React.ComponentType<ModalProp> => {
  if (!ComponentCache.has(path)) {
    const normalizedPath = path.startsWith('./') ? path : `./${path}`;

    // 检查是否有静态映射
    if (componentMap[normalizedPath]) {
      ComponentCache.set(path, lazy(() => {
        // console.log(`Loading component from static map: ${normalizedPath}`);
        return componentMap[normalizedPath]().catch((error) => {
          if (isStaleChunkError(error) && tryReloadForStaleChunk(error)) {
            return { default: () => null };
          }
          console.error(`Failed to load component: ${normalizedPath}`, error);
          return {
            default: () => <ErrorComponent path={normalizedPath} error={error} />
          };
        });
      }));
    } else {
      // 如果没有静态映射，使用动态导入
      ComponentCache.set(path, lazy(() => {
        console.log(`Loading component dynamically: ${normalizedPath}`);
        return import(normalizedPath).catch((error) => {
          if (isStaleChunkError(error) && tryReloadForStaleChunk(error)) {
            return { default: () => null };
          }
          console.error(`Failed to load component: ${normalizedPath}`, error);
          return {
            default: () => <ErrorComponent path={normalizedPath} error={error} />
          };
        });
      }));
    }
  }
  return ComponentCache.get(path)!;
};

const ModalComponent: React.FC<{ container: ModalContainer }> = ({ container }) => {
  const openRef = useRef<boolean>(false);
  const [modal, setModal] = useState<ModalItem | undefined>(undefined);
  const { modals, closeModal } = useModalManager();
  const { playOpen, playClose } = useModalAnimate({ container, modal });
  const zIndex = useMemo(() => {
    const index = modals.findIndex((modal) => modal.name === container.name);
    if (index >= 0) {
      return MODAL_Z_BASE + index;
    } else {
      return 0;
    }
  }, [modals, container.name]);

  const close = useCallback(() => {
    if (!container) return;
    playClose({
      onComplete: () => {
        console.log("close modal complete", container.name);
        closeModal(container.name);
        openRef.current = false;
      }
    });

  }, [container, playClose, closeModal]);
  const SelectedComponent = useMemo(() => {
    return getCachedComponent(container.path);
  }, [container.path]);

  useEffect(() => {
    const m = modals.find((modal) => modal.name === container.name);
    setModal((prev) => {
      if (!m)
        return undefined;
      else if (!prev)
        return m;
      else
        return prev;
    });
  }, [modals, container]);

  useEffect(() => {
    if (!openRef.current && modal) {
      playOpen({
        onComplete: () => {
          openRef.current = true;
        }
      });
    }
  }, [modal, openRef, playOpen]);

  const modalLayer = (
    <div style={{ position: "fixed", inset: 0, zIndex, backgroundColor: "transparent", pointerEvents: modal ? "auto" : "none", overflow: "hidden" }}>
      <div className="modal-mask" ref={(ele) => container.mask = ele} onClick={close}></div>
      <div
        key={`${container.name}`}
        id={`${container.name}`}
        ref={(ele) => container.ele = ele}
        className={'modal-container'}
        data-visible={modal ? true : false}
        data-container-name={container.name}
        data-init={container.init}
      >
        <Suspense fallback={<div />}><SelectedComponent visible={modal ? true : false} data={modal?.data} close={close} /></Suspense>
        <div ref={(ele) => container.closeEle = ele ?? undefined} className="modal-close" onClick={close}>
          X
        </div>
      </div>

    </div>
  );
  if (typeof document !== "undefined" && document.body) {
    return createPortal(modalLayer, document.body);
  }
  return modalLayer;
};


// 优化的主渲染组件
const RenderModal: React.FC = () => {

  const { modalContainers } = useModalManager();

  // 优化的页面渲染
  const renderModals = useMemo(() => {
    console.log("renderModals", modalContainers);
    return Object.values(modalContainers).map((container, index) => (
      <ModalComponent
        key={container.name}
        container={container}
      />
    ));
  }, [modalContainers]);

  return <>{renderModals}</>;
};

export default RenderModal;
