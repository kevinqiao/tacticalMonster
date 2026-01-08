import { ModalContainer, ModalProp, useModalManager } from "@/service/ModalManager";
import React, { lazy, Suspense, useMemo } from "react";
import "./render.css";


// 组件路径映射 - 静态映射所有可能的组件
const componentMap: Record<string, () => Promise<any>> = {
  './battle/PlayTournament': () => import('./battle/PlayTournament'),
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

const ModalComponent: React.FC<{ modalContainer: ModalContainer }> = ({ modalContainer }) => {
  const { openedModals } = useModalManager();
  const props: ModalProp = useMemo(() => {
    const modal = openedModals.find((modal) => modal.name === modalContainer.name);
    return modal ? { visible: true, data: modal.data ?? modalContainer.data } : { visible: false, data: modalContainer.data };
  }, [openedModals, modalContainer]);

  const SelectedComponent = useMemo(() => {
    return getCachedComponent(modalContainer.path);
  }, [modalContainer.path]);

  return <SelectedComponent {...props} />;
};


// 优化的主渲染组件
const RenderModal: React.FC = () => {

  const { modalContainers } = useModalManager();

  // 优化的页面渲染
  const renderModals = useMemo(() => {

    return Object.values(modalContainers).map((modal) => (
      <Suspense key={modal.name} fallback={<div className="modal-loading" />}>
        <ModalComponent
          key={modal.name}
          modalContainer={modal}
        />
      </Suspense>
    ));
  }, [modalContainers]);

  return <>{renderModals}</>;
};

export default RenderModal;
