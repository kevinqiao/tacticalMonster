import gsap from "gsap";
import React, { useEffect, useRef } from 'react';
import { useCombatManager } from '../service/CombatManager';
import "./style.css";
const TokenGrid: React.FC = () => {
  const { game, tokens, boardDimension } = useCombatManager();
  const containerRef = useRef<HTMLDivElement>(null);
  console.log(tokens)
  useEffect(() => {
    if (game && tokens) {
      console.log(game.seats)
    }
  }, [game, boardDimension, tokens])
  useEffect(() => {
    console.log(boardDimension)
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
      gsap.set(token.ele, {
        opacity: 1,
        x: x,
        y: y,
        duration: 1,
        ease: "power2.inOut"
      })
    })



  }, [boardDimension, game])

  return (
    <div ref={containerRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
      {tokens?.map(token => (
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
            borderRadius: "50%",
            backgroundColor: "red",
            border: "1px solid black"
          }}
        />
      ))}
    </div>);
};


export default TokenGrid;
