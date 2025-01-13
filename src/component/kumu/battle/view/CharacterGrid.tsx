import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import "../../map.css";
import usePhasePlay from "../animation/usePlayPhase";
import { useCombatManager } from "../service/CombatManager";
import useCombatAct from "../service/useCombatAct";
import { ASSET_TYPE } from "../types/CharacterTypes";
import { GameCharacter } from "../types/CombatTypes";
import { coordToPixel } from "../utils/hexUtil";
import Character3D from "./Character3D";
import CharacterSpine from "./CharacterSpine";


export interface ICharacterProps {
  character: GameCharacter;
  width: number;
  height: number;
}

interface Props {
  character: GameCharacter;
}

const CharacterCell: React.FC<Props> = ({ character }) => {
  const { map, characters, hexCell, currentRound, gridCells, setResourceLoad } = useCombatManager();
  const { playTurnOn } = usePhasePlay();
  const { attack } = useCombatAct();
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || hexCell.width === 0 || !map) return;
    const q = character.q ?? 0;
    const r = character.r ?? 0;
    const { x, y } = coordToPixel(q, r, hexCell, map);
    gsap.set(containerRef.current, { autoAlpha: 1, x, y, scaleX: character.scaleX ?? 1 });
  }, [character, hexCell, map]);

  useEffect(() => {
    if (!currentRound || !characters || !character || !gridCells) return;
    const currentTurn = currentRound.turns?.find((t: any) => t.status >= 0 && t.status <= 2);
    // console.log("currentTurn", currentRound)
    if (currentTurn && currentTurn.character_id === character.character_id && currentTurn.uid === character.uid) {
      playTurnOn(currentTurn, () => { console.log("playTurnOn", currentTurn) });
    }
  }, [character, characters, currentRound, gridCells]);

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

  const handleAttack = useCallback(() => {
    console.log("handleAttack", character);
    attack(character);
  }, [character]);

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
          padding: 0,
          opacity: 0,
          visibility: "hidden",
          pointerEvents: "none",
          // transform: isFacingRight ? 'none' : 'scaleX(-1)'
        }}
      >
        {/* <div className="hexagon-character" style={{ backgroundImage: `url(${character.asset})` }} /> */}
        <div ref={loadStand} className="character-stand" />
        <div ref={loadAttack} className="character-attack" onClick={handleAttack} />
        {character.asset?.type === ASSET_TYPE.SPINE && <CharacterSpine character={character} width={hexCell.width} height={hexCell.height} />}
        {character.asset?.type === ASSET_TYPE.FBX && <Character3D character={character} width={hexCell.width} height={hexCell.height} />}
      </div>
    </>
  );
};

const CharacterGrid: React.FC<{ position: { top: number, left: number, width: number, height: number } }> = ({ position }) => {
  const { characters } = useCombatManager();

  const render = useMemo(() => {
    return (
      <div style={{ position: "absolute", top: position.top, left: position.left, width: position.width, height: position.height }}>
        {characters?.map((c, index) => (
          <CharacterCell key={"character-" + c.character_id + "-" + index} character={c} />
        ))}
      </div>
    );
  }, [characters, position]);
  return <>{render}</>;
};

export default CharacterGrid;
