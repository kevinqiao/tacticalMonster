import React, { useCallback, useMemo } from 'react';
import { useCombatManager } from '../service/CombatManager';
import { Seat } from '../types/GridTypes';
import "./style.css";

const SeatContainer: React.FC<{ seat: Seat, tileSize: number }> = ({ seat, tileSize }) => {
  const { boardSize } = useCombatManager();
  const position = useMemo(() => {
    const seatSize = Math.floor((boardSize - 3) / 2);
    const p = { top: 0, left: 0, width: seatSize * tileSize, height: seatSize * tileSize };
    switch (seat.no) {
      case 1:
        p.top = 0;
        p.left = (seatSize + 3) * tileSize;
        break;
      case 2:
        p.top = (seatSize + 3) * tileSize;
        p.left = (seatSize + 3) * tileSize;
        break;
      case 3:
        p.top = (seatSize + 3) * tileSize;
        p.left = 0;
        break;
      default:
        break;
    }
    return p
  }, [seat.no, tileSize, boardSize]);
  const color = useMemo(() => {
    return seat.no === 1 ? "red" : seat.no === 2 ? "blue" : seat.no === 3 ? "green" : "yellow";
  }, [seat.no]);

  const loadStation = useCallback((ele: HTMLDivElement | null, no: number) => {
    if (!ele) return;
    const rect = ele.getBoundingClientRect();
    console.log(no, rect);

    switch (no) {
      case 1:
        break;
      case 2:
        break;
      case 3:
        break;
    }

  }, [])

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "absolute", top: position.top, left: position.left, width: position.width, height: position.height, backgroundColor: color }} >
      <div className="container" style={{ backgroundColor: "white" }}>
        <div ref={(ele) => loadStation(ele, 1)} style={{ width: tileSize, height: tileSize, borderRadius: "50%", backgroundColor: color }}></div>
        <div ref={(ele) => loadStation(ele, 2)} style={{ width: tileSize, height: tileSize, borderRadius: "50%", backgroundColor: color }}></div>
        <div ref={(ele) => loadStation(ele, 3)} style={{ width: tileSize, height: tileSize, borderRadius: "50%", backgroundColor: color }}></div>
        <div ref={(ele) => loadStation(ele, 4)} style={{ width: tileSize, height: tileSize, borderRadius: "50%", backgroundColor: color }}></div>
      </div>
    </div>
  );
};

const SeatGrid: React.FC<{ tileSize: number }> = ({ tileSize }) => {
  const { seats } = useCombatManager();

  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "white" }}>
      {seats.map((seat) => (
        <SeatContainer key={seat.no} seat={seat} tileSize={tileSize} />
      ))}
    </div>
  );
};


export default SeatGrid;
