import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import "../../map.css";
import { CharacterUnit } from "../model/CombatModels";
import { useCombatManager } from "../service/CombatManager";
import { hexToPixel } from "../utils/hexUtil";
import CharacterSpine from "./CharacterSpine";

interface Props {
  character: CharacterUnit;
}

const CharacterCell: React.FC<Props> = ({ character }) => {
  const { characters, hexCell, setResourceLoad } = useCombatManager();
  const { width, height } = hexCell;

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current && width > 0) return;
    const { q, r } = character;
    const { x, y } = hexToPixel(q, r, width, height);
    gsap.set(containerRef.current, { x, y });
  }, [character, width]);

  const loadContainer = useCallback(
    (ele: HTMLDivElement | null) => {
      containerRef.current = ele;
      character.container = ele ?? undefined;
      const allLoaded = characters?.every((c) => {
        if (c.container && c.standEle && c.attackEle) {
          return true;
        } else {
          return false;
        }
      });
      if (allLoaded) {
        setResourceLoad((pre) => pre.character === 1 ? pre : ({ ...pre, character: 1 }));
      }
    },
    [character, characters, setResourceLoad]
  );
  const loadStand = useCallback(
    (ele: HTMLDivElement | null) => {

      character.standEle = ele ?? undefined;
      const allLoaded = characters?.every((c) => {
        if (c.container && c.standEle && c.attackEle) {
          return true;
        } else {
          return false;
        }
      });
      if (allLoaded) {
        setResourceLoad((pre) => pre.character === 1 ? pre : ({ ...pre, character: 1 }));
      }
    },
    [character, characters, setResourceLoad]
  );
  const loadAttack = useCallback(
    (ele: HTMLDivElement | null) => {
      character.attackEle = ele ?? undefined;
      const allLoaded = characters?.every((c) => {
        if (c.container && c.standEle && c.attackEle) {
          return true;
        } else {
          return false;
        }
      });
      if (allLoaded) {
        setResourceLoad((pre) => pre.character === 1 ? pre : ({ ...pre, character: 1 }));
      }
    },
    [character, characters, setResourceLoad]
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
          opacity: 0,
          visibility: "hidden",
          pointerEvents: "auto",
        }}
      >
        {/* <div className="hexagon-character" style={{ backgroundImage: `url(${character.asset})` }} /> */}
        <div className="character-stand" />
        <div className="character-attack" />
        <CharacterSpine character={character} width={width} height={height} isFacingRight={true} />
      </div>
    </>
  );
};

const CharacterGrid: React.FC = () => {
  const { characters } = useCombatManager();
  const render = useMemo(() => {
    return (
      <>
        {/* {characters && characters.length > 0 ? <CharacterCell character={characters[0]} /> : null} */}
        {characters?.map((c, index) => (
          <CharacterCell key={"character-" + c.character_id + "-" + index} character={c} />
        ))}
      </>
    );
  }, [characters]);
  return <>{render}</>;
};

export default CharacterGrid;
