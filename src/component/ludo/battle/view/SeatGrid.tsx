import gsap from 'gsap';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCombatManager } from '../service/CombatManager';
import { Seat } from '../types/CombatTypes';
import "./style.css";
const SeatContainer: React.FC<{ seat: Seat }> = ({ seat }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stationRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const [stations, setStations] = useState<{ [key: number]: { x: number, y: number } } | null>(null);
  const { game, boardDimension } = useCombatManager();
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
  useEffect(() => {
    if (stations && boardDimension.width && boardDimension.height) {
      seat?.tokens.forEach(token => {
        console.log(stations[token.id])
        if (token.ele) {
          const x = token.x >= 0 ? token.x / 15 * boardDimension.width : stations[token.id].x
          const y = token.y >= 0 ? token.y / 15 * boardDimension.height : stations[token.id].y
          gsap.set(token.ele, {
            opacity: 1,
            x: x,
            y: y,
            duration: 1,
            ease: "power2.inOut"
          })
        }
      })

    }
  }, [seat, stations, boardDimension.width, boardDimension.height])

  // useEffect(() => {

  //   // 使用 ResizeObserver 来监听尺寸变化
  //   const resizeObserver = new ResizeObserver(() => {
  //     requestAnimationFrame(() => {
  //       if (!containerRef.current) return;

  //       const containerRect = containerRef.current.getBoundingClientRect();
  //       if (containerRect.width === 0 || containerRect.height === 0) return;

  //       Object.entries(stationRefs.current).forEach(([key, element]) => {
  //         if (!element) return;
  //         const stationRect = element.getBoundingClientRect();
  //         if (stationRect.width === 0 || stationRect.height === 0) return;
  //         const offsetX = seatNo === 1 || seatNo === 2 ? 1 + 9 / 15 * boardDimension.width : 0;
  //         const offsetY = seatNo === 2 || seatNo === 3 ? 1 + 9 / 15 * boardDimension.height : 0;
  //         const stationPosition = {
  //           x: stationRect.left - containerRect.left + offsetX,
  //           y: stationRect.top - containerRect.top + offsetY
  //         };
  //         console.log(seatNo, key, stationPosition)
  //         setStations(prev => ({ ...prev, [key]: stationPosition }));
  //       });
  //     });
  //   });

  //   if (containerRef.current) {
  //     resizeObserver.observe(containerRef.current);
  //   }

  //   return () => resizeObserver.disconnect();
  // }, [seatNo, boardDimension.width, boardDimension.height]);

  const tokenRender = useMemo(() => {
    if (!seat) return null;
    return (
      seat.tokens.map(token => {
        return (
          <div
            key={token.id}
            ref={el => token.ele = el}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              opacity: 0,
              width: 1 / 15 * boardDimension.width,
              height: 1 / 15 * boardDimension.height,
              borderRadius: "50%",
              backgroundColor: color,
              border: "1px solid black"
            }}
          />
        )
      })
    )
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
            gap: '8px',
            padding: '8px',
            backgroundColor: 'white',
            width: `${1 / 15 * boardDimension.width * 2.5}px`,
            height: `${1 / 15 * boardDimension.height * 2.5}px`
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
      {/* {tokenRender} */}
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
