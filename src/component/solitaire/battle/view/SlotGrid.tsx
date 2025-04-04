import React from 'react';
import { useCombatManager } from '../service/CombatManager';
import useCombatAct from '../service/useCombatAct';
import { Slot, Zone } from '../types/CombatTypes';
import "./style.css";
const SlotContainer: React.FC<{ slot: Slot, zone: Zone }> = ({ slot, zone }) => {
  const { flipCard } = useCombatAct();
  return (
    <>
      <div ref={(ele) => slot.ele = ele} className="slot" data-id={`${zone.index}_${slot.index}`} style={{
        position: "absolute",
        top: slot.top,
        left: slot.left,
        width: slot.width,
        height: slot.height,
        border: `${"1px solid " + (zone.index === 0 ? "red" : "white")}`,
        pointerEvents: "auto",
        zIndex: -100,
      }}>
      </div >
      {
        zone.index === 1 && slot.index === -1 && <div style={{
          position: "absolute",
          top: slot.top,
          left: slot.left,
          width: slot.width,
          height: slot.height,
          pointerEvents: "auto",
          zIndex: 3000
        }}
          onClick={flipCard}
        >
        </div>
      }

    </>
  );
};

const ZoneContainer: React.FC<{ zone: Zone }> = ({ zone }) => {
  return (
    <>
      {zone?.slots?.map((slot: Slot) => (
        <SlotContainer key={slot.index} slot={slot} zone={zone} />
      ))}
      {/* {zone.index > 1 && <ActionBarGrid zone={zone} />} */}
    </>
  );
};

const SlotGrid: React.FC = () => {
  const { boardDimension } = useCombatManager();
  return (
    <>
      {/* <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}> */}
      {Object.values(boardDimension?.zones || {}).map((zone) => (
        <ZoneContainer key={zone.index} zone={zone} />
      ))}
      {/* </div> */}
    </>
  );
};


export default SlotGrid;