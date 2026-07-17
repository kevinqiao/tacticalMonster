import { modalMatchesActiveContext } from "@/host/util/PageUtils";
import { ModalContainer, ModalItem, ModalProp, useModalManager } from "host/service/ModalManager";
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { requestCasualGameModalExit } from "component/battle/games/shared/casualGameModalExitBridge";
import "./render.css";
import { usePageManager } from "./service/PageManager";
import { useModalAnimate } from "./useModalAnimate";
/** 须高于 `LobbyHome` 顶/底栏 portal（z-index 5200），否则 chrome 会压住 Modal（同为 body 子节点时按数值比较） */
const MODAL_Z_BASE = 5500;

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

/** 与 `RenderApp` 一致：`host/config/PageConfiguration` 中路径相对 `component/` */
function resolveComponentModule(normalizedPath: string): string {
  const rel = normalizedPath.startsWith("./") ? normalizedPath.slice(2) : normalizedPath;
  return `component/${rel}`;
}

// 组件路径映射 - 静态映射所有可能的组件
const componentMap: Record<string, () => Promise<any>> = {
  './battle/PlayTournament': () => import('component/battle/PlayTournament'),
  './lobby/tactical/tournament/TournamentJoinList': () => import('component/lobby/tactical/tournament/TournamentJoinList'),
  './lobby/tactical/tournament/TournamentHistory': () => import('component/lobby/tactical/tournament/TournamentHistory'),
  './battle/games/solitaireSolo/battle/PlaySolitaireSolo': () => import('component/battle/games/solitaireSolo/battle/PlaySolitaireSolo'),
  './battle/games/solitaireSolo/battle/replay/SolitaireRolloutReplayPage': () =>
    import('component/battle/games/solitaireSolo/battle/replay/SolitaireRolloutReplayPage'),
  './battle/games/solitaireSolo/battle/replay/SolitaireVictoryAnimLabPage': () =>
    import('component/battle/games/solitaireSolo/battle/replay/SolitaireVictoryAnimLabPage'),
  './battle/games/solitaireSolo/battle/replay/SolitaireRolloutAnimatedPanel': () =>
    import('component/battle/games/solitaireSolo/battle/replay/SolitaireRolloutAnimatedPanel'),
  './battle/games/blockBlast/battle/PlayBlockBlast': () => import('component/battle/games/blockBlast/battle/PlayBlockBlast'),
  './battle/games/match3/battle/PlayMatch3': () => import('component/battle/games/match3/battle/PlayMatch3'),
  './battle/games/yatz/battle/PlayYatz': () => import('component/battle/games/yatz/battle/PlayYatz'),
  './battle/games/towerArena/battle/PlayTowerArena': () => import('component/battle/games/towerArena/battle/PlayTowerArena'),
  './lobby/tactical/view/play/ChestDrop': () => import('component/lobby/tactical/view/play/ChestDrop'),
  './lobby/casual/view/battlePass/CasualBattlePassModal': () => import('component/lobby/casual/view/battlePass/CasualBattlePassModal'),
  './lobby/casual/view/profile/CasualPlayerProfileModal': () => import('component/lobby/casual/view/profile/CasualPlayerProfileModal'),
  './lobby/casual/view/tasks/CasualTasksModal': () => import('component/lobby/casual/view/tasks/CasualTasksModal'),
  './lobby/casual/view/play/CasualTournamentLobbyModal': () => import('component/lobby/casual/view/play/CasualTournamentLobbyModal'),
  './lobby/casual/view/play/CasualTriathlonLobbyModal': () => import('component/lobby/casual/view/play/CasualTriathlonLobbyModal'),
  './lobby/casual/view/play/PlayCasualTriathlonSession': () => import('component/lobby/casual/view/play/PlayCasualTriathlonSession'),
  './lobby/casual/view/play/CasualSeasonLeaderboardModal': () => import('component/lobby/casual/view/play/CasualSeasonLeaderboardModal'),
  './lobby/casual/view/play/CasualWeeklyLeagueModal': () => import('component/lobby/casual/view/play/CasualWeeklyLeagueModal'),
  './lobby/casual/view/play/CasualWeeklyLeagueCloseModal': () => import('component/lobby/casual/view/play/CasualWeeklyLeagueCloseModal'),
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
        return import(/* @vite-ignore */ resolveComponentModule(normalizedPath)).catch((error) => {
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

  const dismissModal = useCallback(() => {
    if (!container) return;
    playClose({
      onComplete: () => {
        console.log("close modal complete", container.name);
        closeModal(container.name);
        openRef.current = false;
      }
    });

  }, [container, playClose, closeModal]);

  /** 左上角 X / 遮罩：休闲对局内先走结束结算，结算完成仍用 `dismissModal`（onGameSubmit）关窗 */
  const requestClose = useCallback(() => {
    if (requestCasualGameModalExit()) return;
    dismissModal();
  }, [dismissModal]);
  const SelectedComponent = useMemo(() => {
    if (!modal) return null;
    return getCachedComponent(container.path);
  }, [modal, container.path]);

  useEffect(() => {
    const m = modals.find((modal) => modal.name === container.name);
    setModal(() => (m ?? undefined));
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
      <div className="modal-mask" ref={(ele) => container.mask = ele} onClick={requestClose}></div>
      <div
        key={`${container.name}`}
        id={`${container.name}`}
        ref={(ele) => container.ele = ele}
        className={'modal-container'}
        data-visible={modal ? true : false}
        data-container-name={container.name}
        data-init={container.init}
      >
        <div
          className="modal-surface"
          ref={(ele) => (container.surfaceEle = ele ?? undefined)}
        >
          {SelectedComponent ? (
            <Suspense fallback={<div />}>
              <SelectedComponent visible={modal ? true : false} data={modal?.data} close={dismissModal} />
            </Suspense>
          ) : null}
        </div>
        {/* On the shell (not surface) so popCenter/swipe motion does not slide the close control. */}
        <div
          ref={(ele) => (container.closeEle = ele ?? undefined)}
          className="modal-close"
          onClick={requestClose}
        >
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
  const { currentPage } = usePageManager();
  const pathname =
    currentPage?.uri ?? (typeof window !== "undefined" ? window.location.pathname : "");

  const renderModals = useMemo(() => {
    return Object.values(modalContainers)
      .filter((container) => modalMatchesActiveContext(container, pathname))
      .map((container) => (
        <ModalComponent
          key={container.name}
          container={container}
        />
      ));
  }, [modalContainers, pathname]);

  return <>{renderModals}</>;
};

export default RenderModal;
