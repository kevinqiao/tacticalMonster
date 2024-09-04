import { InventoryCategory } from "model/RegisterModel";
import React, { useCallback, useMemo, useState } from "react";
import { usePageManager } from "service/PageManager";
import { useCartManager } from "../context/CartManager";
import { useInventoryManager } from "../context/InventoryManager";
import "./menu.css";

const CategoryHome: React.FC = () => {
  const [curCategory, setCurCategory] = useState<InventoryCategory | null>(null);
  const { selectInventory } = useCartManager();
  const { categories, items } = useInventoryManager();
  const { openNav } = usePageManager();

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

  return (
    <>
      <div className="category-head">
        {curCategory ? (
          <div className="btn" onClick={back}>
            {"<"}
          </div>
        ) : (
          <div className="btn" onClick={openNav}>
            Home
          </div>
        )}
        <div>{curCategory?.name}</div>
        <div className="btn-blank"></div>
      </div>

      <div className="category-container">
        {catChildren?.items?.map((c) => {
          return (
            <div key={c.id} className="category-item" onClick={() => selectInventory(c)}>
              <span style={{ color: "white", fontSize: 15 }}>{c["name"]}</span>
            </div>
          );
        })}
      </div>
      <div className="category-container">
        {catChildren?.categories.map((c) => {
          return (
            <div key={c.id} className="category-item" onClick={() => setCurCategory(c)}>
              <span style={{ color: "white", fontSize: 15 }}>{c.name}</span>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default CategoryHome;
