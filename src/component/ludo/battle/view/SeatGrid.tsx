import React, { useCallback, useMemo, useRef } from 'react';
import { useCombatManager } from '../service/CombatManager';
import useCombatAct from '../service/useCombatAct';
import { ACTION_TYPE, Seat } from '../types/CombatTypes';
import "./style.css";
const SeatContainer: React.FC<{ seat: Seat }> = ({ seat }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { game, boardDimension } = useCombatManager();
  const { selectToken } = useCombatAct();

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
  const releaseToken = useCallback((tokenId: number) => {
    console.log("releaseToken", tokenId);
    const token = seat.tokens.find(t => t.id === tokenId);
    const currentSeat = game?.currentSeat;

    if (token && token.x < 0 && token.y < 0 && currentSeat === seat.no && game?.currentAction?.type === ACTION_TYPE.SELECT)
      selectToken(tokenId);
    else
      console.log("invalid token for release", tokenId);
  }, [seat, selectToken, game]);
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
      }}
      >
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
                border: `2px solid ${color}`,
                pointerEvents: "auto"
              }}
              onClick={() => releaseToken(num)}
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
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {game?.seats.map((seat) => (
        <SeatContainer key={seat.no} seat={seat} />
      ))}
    </div>
  );
};


export default SeatGrid;
