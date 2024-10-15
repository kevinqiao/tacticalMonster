import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import "../map.css";
import { CharacterUnit, PathCell, useCombatManager } from "../service/CombatManager";
interface Props {
  character: CharacterUnit;
}

const CharacterCell: React.FC<Props> = ({ character }) => {
  const pathCellsRef = useRef<PathCell[][] | null>(null);
  const { map, pathCells, selectedCharacter, select } = useCombatManager();
  const { size } = map;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const coverRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (pathCells) pathCellsRef.current = pathCells;
  }, [pathCells]);
  useEffect(() => {
    const { x, y } = character.position;
    const dx = y % 2 !== 0 ? x * (size + 2) + size / 2 : x * (size + 2);
    const dy = y * (size * 0.75 + 2);
    gsap.set(containerRef.current, { x: dx, y: dy, autoAlpha: 1 });
  }, [character, size]);
  const loadContainer = useCallback(
    (ele: HTMLDivElement) => {
      containerRef.current = ele;
      character.container = ele;
    },
    [character]
  );
  const loadCover = useCallback(
    (ele: HTMLDivElement) => {
      coverRef.current = ele;
      character.cover = ele;
    },
    [character]
  );
  const actables = useMemo(() => {
    if (!selectedCharacter) return character.uid === "1" ? [1] : [];
    if (character.uid === "1") return character.id !== selectedCharacter.id ? [1, 2] : [];
    else return [3];
  }, [character, selectedCharacter]);

  const heal = () => {
    console.log("heal colleague");
  };
  const attack = () => {
    console.log("attack enemy");
  };
  return (
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
      {actables.length > 0 ? (
        <div ref={loadCover} className="character-cover">
          {actables.includes(1) ? (
            <div className="act-btn" onClick={() => select(character)}>
              SELECT
            </div>
          ) : null}
          {actables.includes(2) ? (
            <div className="act-btn" onClick={heal}>
              HEAL
            </div>
          ) : null}
          {actables.includes(3) ? (
            <div className="act-btn" onClick={attack}>
              ATTACK
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default CharacterCell;
