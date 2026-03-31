import { ModalConfig, Modals } from "@/model/PageConfiguration";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
export interface ModalProp {
  name: string;
  container: ModalContainer;
  visible: boolean;
  data?: any;
  close: () => void;
}
export interface ModalItem {
  name: string;
  data?: any;
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
  openModal: (name: string, data?: { [key: string]: any } | undefined) => void;
  closeModal: () => void;
  closeAll: () => void;
}
const ModalContext = createContext<IModalContext>({
  modals: [],
  modalContainers: {},
  openModal: () => { },
  closeModal: () => { },
  closeAll: () => { },
});

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [modals, setModals] = useState<ModalItem[]>([]);
  const modalContainers: { [key: string]: ModalContainer } = useMemo(() => {
    return Modals
  }, []);

  const openModal = useCallback((name: string, data?: { [key: string]: any } | undefined) => {
    console.log("open modal", name, data);
    setModals((prev) => {
      const pre = prev.find((modal) => modal.name === name)
      console.log("open modal", pre);
      const p = pre ? prev : [...prev, { name, data }];
      return p;
    });
  }, [])
  const value = {
    modals,
    modalContainers,
    openModal: openModal,
    closeModal: useCallback(() => {
      setModals((prev) => {
        const newModals = prev.slice(0, -1)
        console.log("close modal", newModals);
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
