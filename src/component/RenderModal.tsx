import { ModalContainer, ModalItem, ModalProp, useModalManager } from "@/service/ModalManager";
import gsap from "gsap";
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
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

  const [modal, setModal] = useState<ModalItem | undefined>(undefined);
  const { modals, closeModal } = useModalManager();
  const { playOpen, playClose, syncModalOpenLayout } = useModalAnimate();
  const zIndex = useMemo(() => {
    const index = modals.findIndex((modal) => modal.name === container.name);
    if (index >= 0) {
      return MODAL_Z_BASE + index;
    } else {
      return 0;
    }
  }, [modals, container.name]);
  const close = useCallback(() => {
    if (!modal) return;
    playClose({
      container, modal, onComplete: () => {
        console.log("close modal complete", container.name);
        closeModal(container.name);
      }
    });

  }, [container, modal, closeModal, playClose]);

  const SelectedComponent = useMemo(() => {
    return getCachedComponent(container.path);
  }, [container.path]);
  useEffect(() => {
    if (container.ele && zIndex === 0) {
      if (container.mask) {
        gsap.set(container.mask, {
          autoAlpha: 0,
        });
      }
      if (container.ele) {
        gsap.set(container.ele, {
          autoAlpha: 0,
        });
      }
    }
  }, [zIndex, container.ele]);
  useEffect(() => {
    const m = modals.find((modal) => modal.name === container.name);
    if (m) {
      setModal((prev) => {
        return prev ?? m ?? undefined;
      });
    } else {
      setModal(undefined);
    }
  }, [modals, container.name]);
  useEffect(() => {
    if (modal) {
      console.log("playOpen", container.name, modal);
      playOpen({
        container, modal, onComplete: () => {
          // console.log("open modal complete", container.name);
        }
      });
    }
  }, [container, modal, playOpen]);

  /** 横竖屏 / 视口变化后重算 GSAP 布局，避免 transform 与百分比错位 */
  // useEffect(() => {
  //   if (!modal) return;
  //   let raf = 0;
  //   const scheduleSync = () => {
  //     cancelAnimationFrame(raf);
  //     raf = requestAnimationFrame(() => {
  //       syncModalOpenLayout({ container, modal });
  //     });
  //   };
  //   window.addEventListener("resize", scheduleSync);
  //   window.addEventListener("orientationchange", scheduleSync);
  //   return () => {
  //     cancelAnimationFrame(raf);
  //     window.removeEventListener("resize", scheduleSync);
  //     window.removeEventListener("orientationchange", scheduleSync);
  //   };
  // }, [container, modal, syncModalOpenLayout]);

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
      <Suspense key={container.name} fallback={<div className="modal-loading" />}>
        <ModalComponent
          key={container.name}
          container={container}
        />
      </Suspense>
    ));
  }, [modalContainers]);

  return <>{renderModals}</>;
};

export default RenderModal;
