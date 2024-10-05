import { Combo, InventoryCategory, InventoryItem } from "component/loyalty/model/Order";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useInventoryManager } from "../service/InventoryManager";
import { useOrderManager } from "../service/OrderManager";
import ComboSelector from "./ComboSelector";
import "./menu.css";

const CategoryHome: React.FC<{ reset?: string }> = ({ reset }) => {
  const [curCategory, setCurCategory] = useState<InventoryCategory | null>(null);
  const { selectInventory } = useOrderManager();
  const { categories, items, combos } = useInventoryManager();
  const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);

  const catChildren = useMemo(() => {
    if (curCategory === null) {
      const cats = categories.filter((c) => !c.parent || c.parent === null);
      return { categories: cats };
    } else {
      const res: { categories?: InventoryCategory[]; inventories?: InventoryItem[]; combos?: Combo[] } = {};
      if (curCategory.inventories) {
        const inventories: InventoryItem[] = [];
        curCategory.inventories.forEach((inventoryId: string, index: number) => {
          const item = items.find((item) => item.id === inventoryId);
          if (item) inventories.push(item);
        });
        res["inventories"] = inventories;
      }
      if (curCategory.combos) {
        const comboItems: Combo[] = [];
        curCategory.combos.forEach((comboId: string, index: number) => {
          const item = combos.find((combo) => combo.id === comboId);
          if (item) comboItems.push(item);
        });
        res["combos"] = comboItems;
      }
      const cats = categories.filter((c) => c.parent === curCategory.id);
      res["categories"] = cats;
      // const citems = items.filter((item) => item.categories.includes(curCategory.id));
      return res;
    }
  }, [curCategory, categories, items]);

  const back = useCallback(() => {
    setCurCategory((pre: InventoryCategory | null) => {
      if (pre) {
        const parent = categories.find((c) => c.id === pre.parent);
        return parent ?? null;
      } else return pre;
    });
  }, [categories]);
  const openCombo = useCallback((combo: Combo) => {
    setSelectedCombo(combo);
  }, []);
  useEffect(() => {
    if (reset) setCurCategory(null);
  }, [reset]);

  return (
    <>
      {selectedCombo ? (
        <>
          <div className="combo-container">
            <div className="category-item" style={{ width: "100%" }} onClick={() => setSelectedCombo(null)}>
              <span>返回</span>
            </div>
            <ComboSelector combo={selectedCombo} />
          </div>
        </>
      ) : (
        <div className="category-container">
          {curCategory ? (
            <div className="category-item" onClick={back}>
              <span>返回上一级</span>
            </div>
          ) : null}
          {catChildren?.categories?.map((c) => {
            return (
              <div key={c.id} className="category-item" onClick={() => setCurCategory(c)}>
                <span style={{ color: "white", fontSize: 15 }}>{c.name}</span>
              </div>
            );
          })}
          {catChildren?.inventories?.map((c) => {
            return (
              <div key={c.id} className="category-item" onClick={() => selectInventory(c)}>
                <span style={{ color: "white", fontSize: 15 }}>{c["name"]}</span>
              </div>
            );
          })}
          {catChildren?.combos?.map((c) => {
            return (
              <div key={c.id} className="category-item" onClick={() => openCombo(c)}>
                <span style={{ color: "white", fontSize: 15 }}>{c["name"]}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default CategoryHome;
