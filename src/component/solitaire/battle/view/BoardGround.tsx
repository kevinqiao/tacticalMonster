import React, { useEffect, useMemo } from 'react';
import { useCombatManager } from '../service/CombatManager';
import useCombatAct from '../service/useCombatAct';
import { Seat, Slot, Zone } from '../types/CombatTypes';
import "./style.css";
const SlotContainer: React.FC<{ slot: Slot, zone: Zone }> = ({ slot, zone }) => {
  const { flipCard } = useCombatAct();
  return (
    <>
      <div ref={(ele) => slot.ele = ele} className="slot" data-id={zone.index + "_" + slot.index} style={{
        position: "absolute",
        top: slot.top,
        left: slot.left,
        width: slot.width,
        height: slot.height,
        border: `${"0px solid " + (zone.index === 1 ? "red" : "white")}`,
        pointerEvents: "auto",
        zIndex: -100
      }}
      >
      </div>
      {zone.index === 1 && slot.index === -1 && <div style={{
        position: "absolute",
        top: slot.top,
        left: slot.left,
        width: slot.width,
        height: slot.height,
        pointerEvents: "auto",
        zIndex: 2000
      }}
        onClick={flipCard}
      >
      </div>}

    </>
  );
};
const ActionBarGrid: React.FC<{ zone: Zone }> = ({ zone }) => {
  const { currentAct, game, direction } = useCombatManager();
  const top = useMemo(() => {
    if (!zone || zone.index < 2) return 0;
    return zone.index === 2 ? zone.top - 8 : zone.top + zone.height - 8;
  }, [zone]);
  const size = useMemo(() => {
    if (!game || !game.currentTurn) return 3;
    return game.currentTurn.actions.max;
  }, [currentAct, game]);

  useEffect(() => {
    if (!zone || !game || !game.currentTurn) return;
    const seat: Seat | undefined = game.seats?.find(seat => seat.uid === game.currentTurn?.uid);
    if (!seat) return;
    const zoneIndex = direction === 0 ? seat.field : (seat.field === 2 ? 3 : 2);
    if (zoneIndex === zone.index) {
      for (let i = 1; i <= Object.keys(zone.actionBarEles).length; i++) {
        const ele = zone.actionBarEles[i];
        if (ele) {
          ele.style.border = "1px solid white";
          if (i <= game.currentTurn.actions.acted) {
            ele.style.background = "red";
          } else {
            ele.style.background = "grey";
          }
        }
      }

      if (currentAct && currentAct.act) {
        const actingEle = zone.actionBarEles[currentAct.act];
        if (actingEle) {
          actingEle.style.background = "green";
        }
      }
    } else {
      for (let i = 1; i <= game.currentTurn.actions.max; i++) {
        const ele = zone.actionBarEles[i];
        if (ele) {
          ele.style.background = "transparent";
          ele.style.border = "none";
        }
      }
    }

  }, [zone, currentAct, game, direction]);


  return (
    <>
      <div style={{ position: "absolute", display: "flex", top: top, left: 0, width: zone.width }}>
        {Array.from({ length: size }, (_, i) => i).map((i) => (
          <div key={i + 1} ref={(ele) => zone.actionBarEles[i + 1] = ele} className="action-bar-item" style={{ width: zone.width / size }}></div>
        ))}
      </div>
    </>
  );
};
const ZoneContainer: React.FC<{ zone: Zone }> = ({ zone }) => {
  return (
    <>
      {zone?.slots?.map((slot: Slot) => (
        <SlotContainer key={slot.index} slot={slot} zone={zone} />
      ))}
      {zone.index > 1 && <ActionBarGrid zone={zone} />}
    </>
  );
};
const ZoneCover: React.FC<{ zone: Zone }> = ({ zone }) => {
  return (
    <div ref={(ele) => zone.ele = ele} className="zone"
      style={{ position: "absolute", top: zone.top, left: zone.left, width: zone.width, height: zone.height }}>
      {/* {"zone:" + zone.index} */}
    </div>
  );
};
const BoardGrid: React.FC = () => {
  const { boardDimension } = useCombatManager();
  return (
    <>
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
        {Object.values(boardDimension?.zones || {}).map((zone) => (
          <ZoneContainer key={zone.index} zone={zone} />
        ))}
      </div>
      {Object.values(boardDimension?.zones || {}).map((zone) => (
        <ZoneCover key={zone.index} zone={zone} />
      ))}
    </>
  );
};


export default BoardGrid;
