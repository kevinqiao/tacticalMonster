import React, { useMemo, useRef } from 'react';
import { useCombatManager } from '../service/CombatManager';

import { Seat } from '../types/CombatTypes';
const SeatContainer: React.FC<{ seat: Seat }> = ({ seat }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { game, boardDimension, direction } = useCombatManager();

  // const position = useMemo(() => {
  //   if (!seat || !seat.field || !zones) return { top: 0, left: 0, width: 0, height: 0 };
  //   const p = { top: 0, left: 0, width: 0, height: 0 };
  //   const zone = zones[seat.field];
  //   p.top = zone.top;
  //   p.left = zone.left;
  //   p.width = zone.width;
  //   p.height = zone.height;
  //   return p
  // }, [seat, boardDimension]);

  const zone = useMemo(() => {
    const { zones } = boardDimension || {};
    if (!seat || !seat.field || !zones) return null;
    return zones[direction === 0 ? seat.field : (seat.field === 2 ? 3 : 2)]
  }, [seat, direction, boardDimension]);



  return (
    <>
      <div ref={containerRef} style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "absolute",
        top: zone?.top,
        left: zone?.left,
        width: zone?.width,
        height: zone?.height,
        opacity: 0.7,
        backgroundColor: "black",
        border: "1px solid black",
        zIndex: 10000
      }}
      >
        <span style={{
          position: 'relative',
          opacity: 1,
          color: '#ffffff',
          textShadow: '0 0 10px #ffff00, 0 0 20px #ffff00',
          padding: '2px 5px',
          zIndex: 100000
        }}>{direction === 0 ? (seat.field === 2 ? "Your Turn" : "Opponent Turn") : (seat.field === 2 ? "Opponent Turn" : "Your Turn")}</span>
        {/* <span style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle, rgba(255,255,0,0.8) 0%, rgba(255,255,0,0) 70%)',
          filter: 'blur(5px)',
          zIndex: -1
        }}></span> */}
      </div>

    </>
  );
};


const SeatGrid: React.FC = () => {
  const { game } = useCombatManager();

  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {game?.seats?.map((seat) => (
        <SeatContainer key={seat.field} seat={seat} />
      ))}
    </div>
  );
};


export default SeatGrid;
