import { ModalConfig, Modals } from "@/model/PageConfiguration";
import React, { createContext, useContext, useMemo, useState } from "react";
export interface ModalProp {
  visible: boolean;
  data?: { [key: string]: any };
  close?: () => void;
}
export interface ModalItem {
  name: string;
  data?: { [key: string]: any };
}

export interface ModalContainer extends ModalConfig {
  ele?: HTMLDivElement;
  closeEle?: HTMLDivElement;
  mask?: HTMLDivElement;
  preventNavigation?: boolean;
}

interface IModalContext {
  openedModals: ModalItem[];
  modalContainers: { [key: string]: ModalContainer };
  openModal: (name: string, data?: { [key: string]: any } | undefined) => void;
  closeModal: () => void;
}
const ModalContext = createContext<IModalContext>({
  openedModals: [],
  modalContainers: {},
  openModal: () => { },
  closeModal: () => { },
});

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [openedModals, setOpenedModals] = useState<ModalItem[]>([]);
  const modalContainers: { [key: string]: ModalContainer } = useMemo(() => {
    return Modals
  }, []);
  const value = {
    openedModals,
    modalContainers,
    openModal: (name: string, data?: { [key: string]: any } | undefined) => {
      const modal = Modals[name];
      if (modal) {
        setOpenedModals((prev) => [...prev, { name, data }]);
        return;
      }
    },
    closeModal: () => {
      setOpenedModals((prev) => prev.slice(0, -1));
    }
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
