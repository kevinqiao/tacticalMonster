import React, { useEffect, useRef } from 'react';
import useTurnAnimate from '../animation/useTurnAnimate';
import { useCombatManager } from '../service/CombatManager';
import ControlPanel from './sprite/ControlPanel';
import FoundationGround from './sprite/FoundationGround';
import TurnBar from './sprite/TurnBar';
import YourTurn from './sprite/YourTurn';
import "./style.css";
const SpriteGrid: React.FC = () => {
  const { game, direction, boardDimension } = useCombatManager();
  const { playInitTurn } = useTurnAnimate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!game) return;
    containerRef.current!.style.display = "block";
    // setTimeout(() => {
    playInitTurn();
    // }, 1000)


  }, [game, direction, boardDimension])

  return (
    <div ref={containerRef} style={{ position: "absolute", top: 0, left: 0, zIndex: 1000, display: "none" }}>
      <YourTurn />
      <TurnBar size={3} no={0} />
      <TurnBar size={3} no={1} />
      <ControlPanel no={0} />
      <ControlPanel no={1} />
      <FoundationGround />
      {/* <Seat no={0} />
      <Seat no={1} /> */}
    </div>
  );

};


export default SpriteGrid;
