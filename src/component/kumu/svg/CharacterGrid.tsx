import React from "react";

import { CharacterUnit, useCombatManager } from "../service/CombatManager";
import CharacterCell from "./CharacterCell";

const CharacterGrid: React.FC = () => {
  const { players } = useCombatManager();
  const characters = players.reduce<CharacterUnit[]>((acc, cur) => [...acc, ...cur.characters], []);
  return (
    <>
      {characters.map((c, index) => (
        <CharacterCell key={c.id + "-" + index} character={c} />
      ))}
    </>
  );
};

export default CharacterGrid;
