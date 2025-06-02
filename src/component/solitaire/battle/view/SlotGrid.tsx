import React from 'react';
import { useCombatManager } from '../service/CombatManager';
import { Slot, Zone } from '../types/CombatTypes';
import "./style.css";
const SlotContainer: React.FC<{ slot: Slot, zone: Zone }> = ({ slot, zone }) => {

  return (
    <>
      <div ref={(ele) => slot.ele = ele} className="slot" data-id={`${zone.index}_${slot.index}`} style={{
        position: "absolute",
        top: slot.top,
        left: slot.left,
        width: slot.width,
        height: slot.height,
        border: `${(zone.index === 1 ? "0px solid white" : "0px solid red")}`,
        pointerEvents: "auto",
        zIndex: -10000,
      }}>
      </div >
    </>
  );
};

const ZoneContainer: React.FC<{ zone: Zone }> = ({ zone }) => {
  return (
    <>
      {zone?.slots?.map((slot: Slot) => (
        <SlotContainer key={slot.index} slot={slot} zone={zone} />
      ))}
    </>
  );
};

const SlotGrid: React.FC = () => {
  const { boardDimension } = useCombatManager();
  return (
    <>
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
        {Object.values(boardDimension?.zones || {}).map((zone) => (
          <ZoneContainer key={zone.index} zone={zone} />
        ))}
      </div>
    </>
  );
};


export default SlotGrid;