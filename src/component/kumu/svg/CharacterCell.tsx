import gsap from "gsap";
import React, { useCallback, useEffect, useRef } from "react";
import "../map.css";
import { CharacterUnit, useCombatManager } from "../service/CombatManager";
interface Props {
  character: CharacterUnit;
}

const CharacterCell: React.FC<Props> = ({ character }) => {
  const { map, setResourceLoad } = useCombatManager();
  const { size } = map;
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current && size > 0) return;
    const { x, y } = character.position;
    const dx = Math.floor(y % 2 !== 0 ? x * (size + 2) + size / 2 : x * (size + 2));
    const dy = Math.floor(y * (size * 0.75 + 2));
    console.log("initialize character");
    gsap.set(containerRef.current, { scale: 0.7, x: dx, y: dy });
  }, [character, size]);
  const loadContainer = useCallback(
    (ele: HTMLDivElement) => {
      containerRef.current = ele;
      character.container = ele;
      // onLoad(0);
      setResourceLoad((pre) => ({ ...pre, character: 1 }));
    },
    [character, setResourceLoad]
  );

  return (
    <>
      <div
        ref={loadContainer}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: `${size}px`,
          height: `${size}px`,
          margin: 1,
          // opacity: 0,
          // visibility: "hidden",
          pointerEvents: "auto",
        }}
        onClick={() => console.log("character clicked")}
      >
        <div className="hexagon-character" style={{ backgroundImage: `url(${character.asset})` }} />
      </div>
    </>
  );
};

export default CharacterCell;
