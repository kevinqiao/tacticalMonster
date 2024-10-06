import { Combo, ComboGroup, ComboItem, InventoryItem, Modification } from "component/loyalty/model/Order";
import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInventoryManager } from "../service/InventoryManager";
import ComboBar from "./ComboBar";
import "./menu.css";
import ModifierSelector from "./ModifierSelector";

interface Props {
  initial?: ComboItem[];
  combo: Combo;
  onClose: () => void;
  onSelect: (items: ComboItem[]) => void;
}
const ComboSelector: React.FC<Props> = ({ initial, combo, onClose, onSelect }) => {
  const maskRef = useRef<HTMLDivElement | null>(null);
  const modifierRef = useRef<HTMLDivElement | null>(null);
  const [inventoryItem, setInventoryItem] = useState<InventoryItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<ComboItem[]>(initial ?? []);
  const [selectedGroup, setSelectedGroup] = useState<ComboGroup | null>(null);
  const { items, comboGroups } = useInventoryManager();

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
  const toggleItem = useCallback(
    (m: ComboItem) => {
      if (!selectedGroup) return;
      setSelectedItems((pre) => {
        const max = selectedGroup.max_selection ?? 1;
        const item = pre.find((p) => p.inventoryId === m.inventoryId);
        console.log(item);
        if (item) {
          return pre.filter((p) => p.inventoryId !== item.inventoryId);
        } else {
          const size = pre.filter((p) => p.groupId === selectedGroup.id).length;
          console.log(max + ":" + size);
          if (max > size) {
            return [...pre, { ...m, groupId: selectedGroup.id }];
          } else if (max === 1) {
            const citems = pre.filter((p) => p.groupId !== selectedGroup.id);
            return [...citems, { ...m, groupId: selectedGroup.id }];
          }
        }
        return pre;
      });
    },
    [selectedGroup]
  );
  const selectItem = useCallback(
    (m: ComboItem) => {
      const inventory = items.find((item) => item.id === m.inventoryId);
      if (inventory?.modifierGroups) {
        setInventoryItem(inventory);
      } else toggleItem(m);
    },
    [toggleItem]
  );
  const onComplete = useCallback(() => {
    console.log("combo complete");
    if (onSelect) onSelect(selectedItems);
  }, [selectedItems]);
  const onModifierComplete = useCallback(
    (modifications: Modification[]) => {
      if (inventoryItem && selectedGroup) {
        const inventory = selectedGroup.inventories.find((c) => c.inventoryId === inventoryItem.id);
        const comboItem: ComboItem = {
          inventoryId: inventoryItem.id,
          quantity: 1,
          modifications,
          groupId: selectedGroup.id,
          price: inventory?.price ?? 0,
        };
        toggleItem(comboItem);
        setInventoryItem(null);
      }
    },
    [inventoryItem, selectedGroup]
  );

  const open = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(maskRef.current, { autoAlpha: 1, duration: 0.6 });
    tl.fromTo(modifierRef.current, { autoAlpha: 1, y: "100%" }, { y: 0, duration: 0.6 }, "<");
    tl.play();
  }, []);
  const close = useCallback(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        tl.kill();
      },
    });
    tl.to(maskRef.current, { autoAlpha: 0, duration: 0.6 });
    tl.to(modifierRef.current, { y: "100%", duration: 0.6 }, "<");
    tl.play();
  }, []);
  useEffect(() => {
    if (inventoryItem) {
      open();
    } else close();
  }, [inventoryItem]);
  useEffect(() => {
    if (!selectedGroup && groups && groups.length > 0) {
      setSelectedGroup(groups[0]);
    }
  }, [groups, selectedGroup]);
  return (
    <>
      <div style={{ width: "100%", marginTop: 5 }}>
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
                    onClick={() => selectItem(m)}
                  >
                    {item.name}
                    {item.price > 0 ? " +" + item.price : ""}
                  </div>
                );
            })}
        </div>
      </div>
      <ComboBar combo={combo} selectedItems={selectedItems} groups={groups} onClose={onClose} onComplete={onComplete} />

      <>
        <div
          ref={maskRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            visibility: "hidden",
            backgroundColor: "black",
          }}
        ></div>
        <div
          ref={modifierRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "white",
            opacity: 0,
            visibility: "hidden",
          }}
        >
          <div className="modifier-select-head">
            <div style={{ width: 80 }}></div>
            <div>{inventoryItem?.name}</div>
            <div style={{ width: 80 }} onClick={() => setInventoryItem(null)}>
              Close
            </div>
          </div>
          {inventoryItem ? (
            <ModifierSelector initial={[]} inventoryId={inventoryItem.id} onComplete={onModifierComplete} />
          ) : null}
        </div>
      </>
    </>
  );
};

export default ComboSelector;
