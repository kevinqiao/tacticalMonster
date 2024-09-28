import { InventoryCategory } from "model/Order";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useInventoryManager } from "../service/InventoryManager";
import { useOrderManager } from "../service/OrderManager";
import "./menu.css";

const CategoryHome: React.FC<{ reset?: string }> = ({ reset }) => {
  const [curCategory, setCurCategory] = useState<InventoryCategory | null>(null);
  const { selectInventory } = useOrderManager();
  const { categories, items } = useInventoryManager();

  const catChildren = useMemo(() => {
    if (curCategory === null) {
      const cats = categories.filter((c) => !c.parent || c.parent === null);
      return { categories: cats };
    } else {
      const cats = categories.filter((c) => c.parent === curCategory.id);
      const citems = items.filter((item) => item.categories.includes(curCategory.id));
      return { categories: cats, items: citems };
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
  useEffect(() => {
    if (reset) setCurCategory(null);
  }, [reset]);

  return (
    <>
      <div className="category-container">
        {curCategory ? (
          <div className="category-item" onClick={back}>
            <span>返回上一级</span>
          </div>
        ) : null}
        {catChildren?.categories.map((c) => {
          return (
            <div key={c.id} className="category-item" onClick={() => setCurCategory(c)}>
              <span style={{ color: "white", fontSize: 15 }}>{c.name}</span>
            </div>
          );
        })}
        {catChildren?.items?.map((c) => {
          return (
            <div key={c.id} className="category-item" onClick={() => selectInventory(c)}>
              <span style={{ color: "white", fontSize: 15 }}>{c["name"]}</span>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default CategoryHome;
