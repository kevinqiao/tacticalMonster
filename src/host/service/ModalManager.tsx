import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ModalConfig, Modals } from "../config/PageConfiguration";
import { AudioBus } from "./audio/AudioBus";
import { useUserManager } from "./UserManager";
export interface ModalProp {
  visible: boolean;
  data?: any;
  close: () => void;
}
export interface ModalItem {
  index?: number;
  name: string;
  data?: any;
  effect?: { name: string, args?: any }
}
export interface ModalEvent {
  name?: "modalOpen" | "modalClose";
  modals: string[];
}

export interface ModalContainer extends ModalConfig {
  ele?: HTMLDivElement | null;
  /** Inner surface that plays open/close motion (includes close btn). Shell (`ele`) stays at rest layout. */
  surfaceEle?: HTMLDivElement | null;
  closeEle?: HTMLDivElement | null;
  mask?: HTMLDivElement | null;
  preventNavigation?: boolean;
}

interface IModalContext {
  modalEvent: ModalEvent | null;
  modals: ModalItem[];
  modalContainers: { [key: string]: ModalContainer };
  openModal: ({ name, data, effect }: { name: string, data?: { [key: string]: any }, effect?: { name: string, args?: any } }) => void;
  submitModal: (modal: ModalItem) => void;
  closeModal: (name?: string) => void;
  closeAll: () => void;
}
const ModalContext = createContext<IModalContext>({
  modalEvent: null,
  modals: [],
  modalContainers: {},
  openModal: ({ name, data, effect }: { name: string, data?: { [key: string]: any }, effect?: { name: string, args?: any } }) => { },
  closeModal: (_name?: string) => { },
  submitModal: (modal: ModalItem) => { },
  closeAll: () => { },
});

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, askAuth } = useUserManager();
  const [modals, setModals] = useState<ModalItem[]>([]);
  const [modalEvent, setModalEvent] = useState<ModalEvent | null>(null);
  // const orientation = useSharedValue("lobby.layout.orientation");
  /** 仅在横竖屏 boolean 实际切换时关 modal；避免 portrait 短暂 undefined/null 时误清空 */

  const modalContainers: { [key: string]: ModalContainer } = useMemo(() => {
    return Modals
  }, []);

  const openModal = useCallback(({ name, data, effect }: { name: string, data?: { [key: string]: any }, effect?: { name: string, args?: any } }) => {

    const container = modalContainers[name];
    if (container && container.auth === 1 && !user?.uid) {
      askAuth({ modal: { name, data, effect } });
      return;
    }
    setModals((prev) => {
      const i = prev.findIndex((m) => m.name === name);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { name, data, effect };
        return next;
      }
      setModalEvent({ name: "modalOpen", modals: [name] });
      AudioBus.emit("ui.modal.open");
      return [...prev, { name, data, effect }];
    });

  }, [user, askAuth, modalContainers])
  const submitModal = useCallback((modal: ModalItem) => {
    setModals((prev) => {
      const pre = prev.find((modal) => modal.name === modal.name)
      const p = pre ? prev : [...prev, modal];
      return p;
    });
  }, []);

  console.log("modals", modals);
  const value = {
    modalEvent,
    modals,
    modalContainers,
    submitModal: submitModal,
    openModal: openModal,
    closeModal: useCallback((name?: string) => {
      setModals((prev) => {
        if (!name) {
          if (prev.length > 0) {
            setModalEvent({ name: "modalClose", modals: [prev[prev.length - 1]!.name] });
            AudioBus.emit("ui.modal.close");
          }
          return prev.slice(0, -1);
        }
        setModalEvent({ name: "modalClose", modals: [name] });
        AudioBus.emit("ui.modal.close");
        return prev.filter((modal) => modal.name !== name);
      })
    }, []),
    closeAll: useCallback(() => {
      setModals((prev) => {
        if (prev && prev.length > 0) {
          setModalEvent({ name: "modalClose", modals: prev.map((modal) => modal.name) });
          AudioBus.emit("ui.modal.close");
        }
        return [];
      })
    }, []),
  }


  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};
export const useModalManager = () => {
  const value = useContext(ModalContext);
  if (!value) {
    throw new Error("useModalManager must be used within a ModalProvider");
  }
  return value;
};
export default ModalProvider;
