import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import "../../map.css";
import usePhasePlay from "../animation/playPhase";
import { useCombatManager } from "../service/CombatManager";
import { CharacterUnit } from "../types/CombatTypes";
import { coordToPixel } from "../utils/hexUtil";
import CharacterSpine from "./CharacterSpine";

interface Props {
  character: CharacterUnit;
}

const CharacterCell: React.FC<Props> = ({ character }) => {
  const { map, characters, challenger, challengee, hexCell, currentRound, gridCells, setResourceLoad } = useCombatManager();
  const { playTurnStart, playTurnOn } = usePhasePlay();

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || hexCell.width === 0 || !map) return;
    const { q, r } = character;
    const { x, y } = coordToPixel(q, r, hexCell, map);
    gsap.set(containerRef.current, { autoAlpha: 1, x, y, scaleX: character.scaleX ?? 1 });
  }, [character, hexCell, map]);

  useEffect(() => {
    if (!currentRound || !gridCells || !characters || !character) return;
    const currentTurn = currentRound.turns.find((t: any) => t.status >= 0 && t.status <= 2);
    if (currentTurn && currentTurn.character_id === character.character_id && currentTurn.uid === character.uid) {
      playTurnOn(currentTurn, () => { console.log("playTurnOn", currentTurn) });
      // const moveRange = currentTurn.status === 1 ? (character.move_range ?? 2) : 1;
      // const nodes = getWalkableNodes(gridCells, { x: character.q, y: character.r }, moveRange);
      // character.walkables = nodes;
      // const enemies = characters.filter((c) => c.uid !== character.uid && c.character_id !== character.character_id);
      // const attackableNodes = getAttackableNodes(character, enemies, character.attack_range || { min: 1, max: 2 });
      // character.attackables = attackableNodes;
      // console.log("character", character);
      // playTurnStart(character, null);
    }
  }, [character, characters, currentRound, gridCells, playTurnStart]);

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
          width: `${hexCell.width}px`,
          height: `${hexCell.height}px`,
          margin: 0,
          opacity: 0,
          visibility: "hidden",
          pointerEvents: "auto",
          // transform: isFacingRight ? 'none' : 'scaleX(-1)'
        }}
      >
        {/* <div className="hexagon-character" style={{ backgroundImage: `url(${character.asset})` }} /> */}
        <div ref={loadStand} className="character-stand" />
        <div ref={loadAttack} className="character-attack" />
        <CharacterSpine character={character} width={hexCell.width} height={hexCell.height} />
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
