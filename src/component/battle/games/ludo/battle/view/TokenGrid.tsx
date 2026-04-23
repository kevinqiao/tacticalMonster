import gsap from 'gsap';
import React, { useEffect, useRef } from 'react';
import useTokenAnimate from '../animation/useTokenAnimate';
import { useCombatManager } from '../service/CombatManager';
import { Token } from '../types/CombatTypes';
import "./style.css";

const TokenGrid: React.FC = () => {
  const { game, tokens, boardDimension } = useCombatManager();
  const { groupingTokens } = useTokenAnimate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {

    if (!boardDimension || !tokens) return;
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    tokens.forEach(token => {
      const seat = game?.seats.find(seat => seat.no === token.seatNo);
      if (!seat) return;
      const station = seat.stationEles[token.id];
      const stationRect = station?.getBoundingClientRect();
      if (!stationRect || !token.ele) return;
      const x = token.x >= 0 ? token.x / 15 * boardDimension.width : stationRect.left - containerRect.left
      const y = token.y >= 0 ? token.y / 15 * boardDimension.height : stationRect.top - containerRect.top

      // console.log("token", token.seatNo, token.id, x, y);
      gsap.set(token.ele, {
        opacity: 1,
        x: x,
        y: y,
        ease: "power2.inOut"
      })
    })

    const grouped = tokens.filter((t) => t.x >= 0 && t.y >= 0).reduce((acc: { [key: string]: Token[] }, token) => {
      const key = `${token.x},${token.y}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(token);
      return acc;
    }, {});
    const groupTokens = Object.values(grouped);
    groupTokens.forEach((gtokens: Token[]) => {
      groupingTokens(gtokens);
    })


  }, [boardDimension, game])


  return (
    <div ref={containerRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
      {tokens?.map(token => {
        const color = token.seatNo === 1 ? "red" : (token.seatNo === 2 ? "blue" : (token.seatNo === 3 ? "green" : "yellow"))
        return (
          <div
            key={token.seatNo + "-" + token.id}
            ref={el => token.ele = el}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              opacity: 0,
              width: 1 / 15 * boardDimension.width,
              height: 1 / 15 * boardDimension.height,
            }}
          >
            <div className="token-frame" ref={el => token.selectEle = el} />
            <div className="token" style={{ backgroundColor: color, pointerEvents: "none" }}>
              <div className="token-center"></div>
            </div>
          </div>
        )
      })}
    </div>
  );
};


export default TokenGrid;
