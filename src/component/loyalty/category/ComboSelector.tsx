import { Combo, ComboGroup, ComboItem } from "component/loyalty/model/Order";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useInventoryManager } from "../service/InventoryManager";
import ComboBar from "./ComboBar";
import "./menu.css";

interface Props {
  initial?: ComboItem[];
  combo: Combo;
}
const ComboSelector: React.FC<Props> = ({ initial, combo }) => {
  const [selectedItems, setSelectedItems] = useState<ComboItem[]>(initial ?? []);
  const [selectedGroup, setSelectedGroup] = useState<ComboGroup | null>(null);
  const { items, comboGroups, combos } = useInventoryManager();
  const groups = useMemo(() => {
    if (combo && comboGroups) {
      return comboGroups.filter((grp) => combo.combogrps.includes(grp.id));
    }
  }, [combo, comboGroups]);
  const isActive = useCallback(
    (m: ComboItem) => {
      const mod = selectedItems.find((md) => md.inventoryId === m.inventoryId);
      return mod ? true : false;
    },
    [selectedItems, selectedGroup]
  );
  console.log(selectedItems);
  const checkInventory = useCallback(
    (m: ComboItem) => {
      if (!selectedGroup) return;
      setSelectedItems((pre) => {
        const max = selectedGroup.max_selection ?? 1;
        const item = pre.find((p) => p.inventoryId === m.inventoryId);
        if (item) {
          return pre.filter((p) => p.inventoryId !== item.inventoryId);
        } else {
          const size = pre.filter((p) => p.groupId === selectedGroup.id).length;
          if (max > size) return [...pre, { ...m, groupId: selectedGroup.id }];
          else if (max === 1) {
            const citems = pre.filter((p) => p.groupId !== selectedGroup.id);
            return [...citems, { ...m, groupId: selectedGroup.id }];
          }
        }
        return pre;
      });
    },
    [selectedGroup]
  );
  useEffect(() => {
    if (!selectedGroup && groups && groups.length > 0) {
      setSelectedGroup(groups[0]);
    }
  }, [groups, selectedGroup]);
  return (
    <>
      <div style={{ width: "100%" }}>
        <div className="modifier-group-container">
          {groups?.map((grp, index) => (
            <div
              key={grp.id + ""}
              className="modifier-group-item"
              style={{ backgroundColor: selectedGroup && grp.id === selectedGroup.id ? "blue" : "grey" }}
              onClick={() => setSelectedGroup(grp)}
            >
              {grp.name}
            </div>
          ))}
        </div>
        <div className="modifiers-container">
          {selectedGroup &&
            selectedGroup.inventories.map((m: ComboItem) => {
              const item = items.find((item) => item.id === m.inventoryId);
              if (item)
                return (
                  <div
                    key={item.id}
                    className="modifiers-item"
                    style={{ backgroundColor: isActive(m) ? "red" : "grey" }}
                    onClick={() => checkInventory(m)}
                  >
                    {item.name}
                    {item.price > 0 ? " +" + item.price : ""}
                  </div>
                );
            })}
        </div>
      </div>
      <ComboBar comboItems={selectedItems} />
    </>
  );
};

export default ComboSelector;
