import { ModalConfig, Modals } from "@/model/PageConfiguration";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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

export interface ModalContainer extends ModalConfig {
  ele?: HTMLDivElement | null;
  closeEle?: HTMLDivElement | null;
  mask?: HTMLDivElement | null;
  preventNavigation?: boolean;
}

interface IModalContext {
  modals: ModalItem[];
  modalContainers: { [key: string]: ModalContainer };
  openModal: (name: string, data?: { [key: string]: any }, effect?: { name: string, args?: any } | undefined) => void;
  closeModal: (name?: string) => void;
  closeAll: () => void;
}
const ModalContext = createContext<IModalContext>({
  modals: [],
  modalContainers: {},
  openModal: () => { },
  closeModal: (_name?: string) => { },
  closeAll: () => { },
});

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, authReq, askAuth } = useUserManager();
  const [modals, setModals] = useState<ModalItem[]>([]);
  const modalContainers: { [key: string]: ModalContainer } = useMemo(() => {
    return Modals
  }, []);

  const openModal = useCallback((name: string, data?: { [key: string]: any }, effect?: { name: string, args?: any } | undefined) => {
    const container = modalContainers[name];
    if (container && container.auth === 1 && !user?.uid) {
      askAuth({ modal: { name, data, effect } });
      return;
    }
    setModals((prev) => {
      const pre = prev.find((modal) => modal.name === name)
      // console.log("open modal", pre);
      const p = pre ? prev : [...prev, { name, data, effect }];
      return p;
    });

  }, [user, askAuth])
  useEffect(() => {
    if (authReq && authReq.modal && user?.uid) {
      openModal(authReq.modal.name, authReq.modal.data, authReq.modal.effect);
    }
  }, [authReq, user, openModal]);
  const value = {
    modals,
    modalContainers,
    openModal: openModal,
    closeModal: useCallback((name?: string) => {
      setModals((prev) => {
        if (!name) {
          const newModals = prev.slice(0, -1);
          console.log("close modal(last)", newModals);
          return newModals;
        }
        const newModals = prev.filter((modal) => modal.name !== name);
        // console.log("close modal", newModals);
        return newModals;
      })
    }, []),
    closeAll: useCallback(() => {
      setModals([]);
    }, []),
  }

  console.log("modals", modals);
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
