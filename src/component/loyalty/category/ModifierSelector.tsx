import { InventoryModifier, Modification } from "model/Order";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useInventoryManager } from "../service/InventoryManager";
import "./menu.css";
interface ModifierGroup {
  id: string;
  name: string;
  description?: string;
  min_selection?: number;
  max_selection?: number;
  modifiers: InventoryModifier[];
}
interface Props {
  initial: Modification[];
  inventoryId: string;
  onUpdate: (modifications: Modification[]) => void;
}
const ModifierSelector: React.FC<Props> = ({ initial, inventoryId, onUpdate }) => {
  const [modifications, setModifications] = useState<Modification[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ModifierGroup | null>(null);
  const { items, modifierGroups, modifiers } = useInventoryManager();
  console.log(initial);
  const mgroups: ModifierGroup[] = useMemo(() => {
    const mgrps: ModifierGroup[] = [];
    if (modifiers && modifierGroups && items) {
      const item = items.find((c) => c.id === inventoryId);
      console.log(item);
      if (item?.modifierGroups) {
        for (const gid of item.modifierGroups) {
          const mg = modifierGroups.find((m) => m.id === gid);
          if (mg?.modifiers) {
            const grp: ModifierGroup = { ...mg, modifiers: [] };
            for (const mid of mg.modifiers) {
              const md: InventoryModifier | undefined = modifiers.find((mo) => mo.id === mid);
              if (md) {
                grp.modifiers.push(md);
              }
            }
            mgrps.push(grp);
          }
        }
      }
    }
    return mgrps;
  }, [modifierGroups, modifiers, inventoryId, items]);
  useEffect(() => {
    setModifications(initial);
  }, [initial]);
  useEffect(() => {
    if (mgroups.length > 0) setSelectedGroup(mgroups[0]);
  }, [mgroups]);
  const selectModifier = useCallback(
    (m: InventoryModifier) => {
      if (selectedGroup) {
        const modies = modifications.filter((md) => {
          const sm = selectedGroup.modifiers.find((mg) => mg.id === md.id);
          return sm ? false : true;
        });
        if (modies) {
          const newUpdate = [...modies, { id: m.id, quantity: 1, price: m.price }];
          setModifications(newUpdate);
          onUpdate(newUpdate);
        }
      }
    },
    [selectedGroup, modifications]
  );
  const isActive = useCallback(
    (m: InventoryModifier) => {
      const mod = modifications.find((md) => md.id === m.id);
      return mod ? true : false;
    },
    [modifications]
  );
  return (
    <>
      <div style={{ width: "100%", height: "100%" }}>
        <div className="modifier-group-container">
          {mgroups.map((grp, index) => (
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
          {selectedGroup?.modifiers.map((m) => (
            <div
              key={m.id}
              className="modifiers-item"
              style={{ backgroundColor: isActive(m) ? "red" : "grey" }}
              onClick={() => selectModifier(m)}
            >
              {m.name}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ModifierSelector;
