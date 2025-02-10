import React, { useCallback, useMemo } from 'react';
import { useCombatManager } from '../service/CombatManager';
import { Seat } from '../types/GridTypes';
import "./style.css";

const SeatContainer: React.FC<{ seat: Seat, tileSize: number }> = ({ seat, tileSize }) => {

  const position = useMemo(() => {
    const p: { top: any; left?: any; width: any; height: any } = { top: 0, width: `${100 * 6 / 15}%`, height: `${100 * 6 / 15}%` };
    switch (seat.no) {
      case 1:
        p.top = 0;
        p.left = `${100 * 9 / 15}%`;
        break;
      case 2:
        p.top = `${100 * 9 / 15}%`;
        p.left = `${100 * 9 / 15}%`;
        break;
      case 3:
        p.top = `${100 * 9 / 15}%`;
        p.left = 0;
        break;
      default:
        break;
    }
    return p
  }, [seat.no]);

  const color = useMemo(() => {
    switch (seat.no) {
      case 1:
        return "red";
      case 2:
        return "blue";
      case 3:
        return "green";
      default:
        return "yellow";
    }
  }, [seat.no]);

  const loadStation = useCallback((ele: HTMLDivElement | null, no: number) => {
    if (!ele) return;
    const rect = ele.getBoundingClientRect();

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
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "absolute", top: position.top, left: position.left, width: position.width, height: position.height, backgroundColor: color, border: "1px solid black" }} >
      <div className="seat-container" style={{ backgroundColor: "white" }}>
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
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
      {seats.map((seat) => (
        <SeatContainer key={seat.no} seat={seat} tileSize={tileSize} />
      ))}
    </div>
  );
};


export default SeatGrid;
