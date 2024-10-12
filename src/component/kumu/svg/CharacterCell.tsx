import gsap from "gsap";
import React, { useCallback, useEffect, useRef } from "react";
import "../map.css";
import { CharacterUnit, useCombatManager } from "../service/CombatManager";
interface Props {
  character: CharacterUnit;
}

const CharacterCell: React.FC<Props> = ({ character }) => {
  const { map } = useCombatManager();
  const { size } = map;
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const { x, y } = character.position;
    const dx = y % 2 !== 0 ? x * (size + 2) + size / 2 : x * (size + 2);
    const dy = y * (size * 0.75 + 2);
    gsap.set(containerRef.current, { x: dx, y: dy, autoAlpha: 1 });
  }, [character, size]);
  const move = useCallback(() => {
    const { x, y } = character.position;
    gsap.to(containerRef.current, { x: y % 2 === 0 ? 2 * (size + 2) : 2 * (size + 2) + size / 2, duration: 1 });
  }, [character, size]);
  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: `${size}px`,
        height: `${size}px`,
        margin: 1,
        opacity: 0,
        visibility: "hidden",
      }}
      onClick={move}
    >
      <div className="hexagon-div" />
    </div>
  );
};

export default CharacterCell;
