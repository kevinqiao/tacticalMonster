import React, { useCallback, useEffect, useMemo, useRef } from "react";
import "../../map.css";
import { CharacterUnit } from "../model/CombatModels";
import { useCombatManager } from "../service/CombatManager";
import SpineSprite from "./SpineSprite";
interface Props {
  character: CharacterUnit;
}

const CharacterCell: React.FC<Props> = ({ character }) => {
  const { hexCell, setResourceLoad } = useCombatManager();
  const { width, height } = hexCell;

  const containerRef = useRef<HTMLDivElement | null>(null);
  console.log(character);
  useEffect(() => {
    if (!containerRef.current && width > 0) return;
    const { q: x, r: y } = character;
    const dx = Math.floor(y % 2 !== 0 ? x * width + width / 2 : x * width);
    const dy = Math.floor(y * (height * 0.75));
    // gsap.set(containerRef.current, { scale: 0.7, x: dx, y: dy });
  }, [character, width]);
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
          width: `${width}px`,
          height: `${height}px`,
          margin: 0,
          // opacity: 0,
          // visibility: "hidden",
          pointerEvents: "auto",
        }}
      >
        {/* <div className="hexagon-character" style={{ backgroundImage: `url(${character.asset})` }} /> */}
        <SpineSprite width={width} height={height} />
      </div>
    </>
  );
};

const CharacterGrid: React.FC = () => {
  const { characters } = useCombatManager();
  const render = useMemo(() => {
    return (
      <>
        {characters && characters.length > 0 ? <CharacterCell character={characters[0]} /> : null}
        {/* {characters?.map((c, index) => (
          <CharacterCell key={"character-" + c.character_id + "-" + index} character={c} />
        ))} */}
      </>
    );
  }, [characters]);
  return <>{render}</>;
};

export default CharacterGrid;
