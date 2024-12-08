import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import "../../map.css";
import { CharacterUnit } from "../model/CombatModels";
import { useCombatManager } from "../service/CombatManager";
interface Props {
  character: CharacterUnit;
}

const CharacterCell: React.FC<Props> = ({ character }) => {
  const { cellSize: size, setResourceLoad } = useCombatManager();

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current && size > 0) return;
    const { x, y } = character.position;
    const dx = Math.floor(y % 2 !== 0 ? x * size + size / 2 : x * size);
    const dy = Math.floor(y * (size * 0.75));
    gsap.set(containerRef.current, { scale: 0.7, x: dx, y: dy });
  }, [character, size]);
  const loadContainer = useCallback(
    (ele: HTMLDivElement | null) => {
      containerRef.current = ele;
      character.container = ele ?? undefined;
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
          margin: 0,
          // opacity: 0,
          // visibility: "hidden",
          pointerEvents: "auto",
        }}
      >
        <div className="hexagon-character" style={{ backgroundImage: `url(${character.asset})` }} />
      </div>
    </>
  );
};

const CharacterGrid: React.FC = () => {
  const { characters } = useCombatManager();
  const render = useMemo(() => {
    return (
      <>
        {characters?.map((c, index) => (
          <CharacterCell key={"character-" + c.character_id + "-" + index} character={c} />
        ))}
      </>
    );
  }, [characters]);
  return <>{render}</>;
};

export default CharacterGrid;
