import React, { useMemo } from "react";

import { useCombatManager } from "../service/CombatManager";
import { CharacterUnit } from "../service/CombatModels";
import CharacterCell from "./CharacterCell";

const CharacterGrid: React.FC = () => {
  const { players } = useCombatManager();
  const characters = useMemo(() => {
    if (players) return players.reduce<CharacterUnit[]>((acc, cur) => [...acc, ...cur.characters], []);
  }, [players]);
  return <>{characters?.map((c, index) => <CharacterCell key={"character-" + c.id + "-" + index} character={c} />)}</>;
};

export default CharacterGrid;
