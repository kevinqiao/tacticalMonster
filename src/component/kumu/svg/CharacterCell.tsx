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
    const { x, y } = character.position;
    const dx = y % 2 !== 0 ? x * (size + 2) + size / 2 : x * (size + 2);
    const dy = y * (size * 0.75 + 2);

    gsap.set(containerRef.current, { x: dx, y: dy });
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
          opacity: 0,
          visibility: "hidden",
        }}
      >
        <div className="hexagon-character" style={{ backgroundImage: `url(${character.asset})` }} />
      </div>
    </>
  );
};

export default CharacterCell;
