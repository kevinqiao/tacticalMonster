import { ModalContainer, ModalItem, ModalProp, useModalManager } from "@/service/ModalManager";
import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import "./render.css";
import { useModalAnimate } from "./shell/useModalAnimate";


// 组件路径映射 - 静态映射所有可能的组件
const componentMap: Record<string, () => Promise<any>> = {
  './battle/PlayTournament': () => import('./battle/PlayTournament'),
  './battle/GameOver': () => import('./battle/GameOver'),
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
  const { playOpen, playClose } = useModalAnimate();
  const zIndex = useMemo(() => {
    const index = modals.findIndex((modal) => modal.name === container.name);
    if (index >= 0) {
      return 500 + index;
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
      playOpen({
        container, modal, onComplete: () => {
          // console.log("open modal complete", container.name);
        }
      });
    }
  }, [modal, playOpen]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex, backgroundColor: 'transparent', pointerEvents: modal ? 'auto' : 'none' }}>
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
      </div>
      <div ref={(ele) => container.closeEle = ele ?? undefined} className="modal-close" onClick={close}>
        X
      </div>
    </div>
  )
};


// 优化的主渲染组件
const RenderModal: React.FC = () => {

  const { modalContainers } = useModalManager();

  // 优化的页面渲染
  const renderModals = useMemo(() => {

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
