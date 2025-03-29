import React, { useEffect } from 'react';
import useTurnAnimate from '../animation/useTurnAnimate';
import { useCombatManager } from '../service/CombatManager';
import { useSprite } from '../service/SpriteProvider';
import ControlPanel from './sprite/ControlPanel';
import TurnBar from './sprite/TurnBar';
import YourTurn from './sprite/YourTurn';
import "./style.css";
const SpriteGrid: React.FC = () => {
  const { game, direction, boardDimension } = useCombatManager();
  const { playInitTurn } = useTurnAnimate();
  const { allSpritesLoaded } = useSprite();
  useEffect(() => {
    if (!game) return;
    // setTimeout(() => {
    playInitTurn();
    // }, 1000)


  }, [game, direction, boardDimension])

  return (
    <div style={{ position: "absolute", top: 0, left: 0, zIndex: 2000 }}>
      <YourTurn />
      <TurnBar size={3} no={0} />
      <TurnBar size={3} no={1} />
      <ControlPanel no={0} />
      <ControlPanel no={1} />


      {/* <Seat no={0} />
      <Seat no={1} /> */}
    </div>
  );

};


export default SpriteGrid;
