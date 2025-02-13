import React, { useMemo, useRef } from 'react';
import { useCombatManager } from '../service/CombatManager';
import { Seat } from '../types/CombatTypes';
import "./style.css";
const SeatContainer: React.FC<{ seat: Seat }> = ({ seat }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { boardDimension } = useCombatManager();
  // const seat = useMemo(() => game?.seats.find(seat => seat.no === seatNo), [game, seatNo]);

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
  }, [seat]);

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
  }, [seat]);

  return (
    <>
      <div ref={containerRef} style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "absolute",
        top: position.top,
        left: position.left,
        width: position.width,
        height: position.height,
        backgroundColor: color,
        border: "1px solid black"
      }}>
        <div
          className="seat-container"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '4px',
            padding: '4px',
            backgroundColor: 'white',
            width: `${1 / 15 * boardDimension.width * 3}px`,
            height: `${1 / 15 * boardDimension.height * 3}px`
          }}
        >
          {[0, 1, 3, 2].map(num => (
            <div
              key={num}
              ref={el => seat.stationEles[num] = el}
              style={{
                width: 1 / 15 * boardDimension.width,
                height: 1 / 15 * boardDimension.height,
                borderRadius: "50%",
                backgroundColor: "white",
                border: `2px solid ${color}`
              }}
            />
          ))}
        </div>
      </div>

    </>
  );
};


const SeatGrid: React.FC = () => {
  const { game } = useCombatManager();

  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
      {game?.seats.map((seat) => (
        <SeatContainer key={seat.no} seat={seat} />
      ))}
    </div>
  );
};


export default SeatGrid;
