import { ModalConfig, Modals } from "@/model/PageConfiguration";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
export interface ModalProp {
  name: string;
  container: ModalContainer;
  visible: boolean;
  data?: { [key: string]: any };
  close?: () => void;
}
export interface ModalItem {
  name: string;
  data?: { [key: string]: any };
}

export interface ModalContainer extends ModalConfig {
  ele?: HTMLDivElement | null;
  closeEle?: HTMLDivElement;
  mask?: HTMLDivElement;
  preventNavigation?: boolean;
}

interface IModalContext {
  openedModals: ModalItem[];
  modalContainers: { [key: string]: ModalContainer };
  openModal: (name: string, data?: { [key: string]: any } | undefined) => void;
  closeModal: () => void;
  closeAll: () => void;
}
const ModalContext = createContext<IModalContext>({
  openedModals: [],
  modalContainers: {},
  openModal: () => { },
  closeModal: () => { },
  closeAll: () => { },
});

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [openedModals, setOpenedModals] = useState<ModalItem[]>([]);
  const modalContainers: { [key: string]: ModalContainer } = useMemo(() => {
    return Modals
  }, []);

  const value = {
    openedModals,
    modalContainers,
    openModal: useCallback((name: string, data?: { [key: string]: any } | undefined) => {
      setOpenedModals((prev) => {
        return prev.find((modal) => modal.name === name) ? prev : [...prev, { name, data }];
      });
    }, [modalContainers]),
    closeModal: useCallback(() => {
      setOpenedModals((prev) => {
        const newModals = prev.slice(0, -1)
        console.log("close modal", newModals);
        return newModals;
      })
    }, []),
    closeAll: useCallback(() => {
      setOpenedModals([]);
    }, []),
  }

  console.log("openedModals", openedModals);
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
