import {
  Combo,
  ComboGroup,
  InventoryCategory,
  InventoryItem,
  InventoryModifier,
  InventoryModifierGroup,
} from "component/loyalty/model/Order";
import { useConvex } from "convex/react";
import React, { ReactNode, createContext, useContext, useEffect, useState } from "react";
import useLocalization from "service/LocalizationManager";
import { usePartnerManager } from "service/PartnerManager";
import { api } from "../../../convex/_generated/api";
interface InventoryModel {
  categories: InventoryCategory[];
  comboGroups: ComboGroup[];
  combos: Combo[];
  items: InventoryItem[];
  modifierGroups: InventoryModifierGroup[];
  modifiers: InventoryModifier[];
}
interface IInventoryContext {
  comboGroups: ComboGroup[];
  combos: Combo[];
  categories: InventoryCategory[];
  items: InventoryItem[];
  modifierGroups: InventoryModifierGroup[];
  modifiers: InventoryModifier[];
}
const InventoryContext = createContext<IInventoryContext>({
  comboGroups: [],
  combos: [],
  categories: [],
  items: [],
  modifierGroups: [],
  modifiers: [],
});

const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [inventory, setInventory] = useState<InventoryModel | null>(null);
  const { partner } = usePartnerManager();
  const { locale } = useLocalization();
  const convex = useConvex();

  useEffect(() => {
    const fetchInventory = async (pid: number) => {
      const res = await convex.query(api.loyalty.register.findInventory, { partnerId: pid, locale });
      console.log(res);
      setInventory(res);
    };
    if (partner && locale) {
      fetchInventory(partner.pid);
    }
  }, [partner, locale]);

  return (
    <>{inventory ? <InventoryContext.Provider value={inventory}> {children} </InventoryContext.Provider> : null}</>
  );
};
export const useInventoryManager = () => {
  return useContext(InventoryContext);
};
export default InventoryProvider;
