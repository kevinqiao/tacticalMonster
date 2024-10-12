import React from "react";

import { useCombatManager } from "../service/CombatManager";
import CharacterCell from "./CharacterCell";

const CharacterGrid: React.FC = () => {
  const { characters } = useCombatManager();
  return (
    <>
      {characters.map((c) => (
        <CharacterCell key={c.id + ""} character={c} />
      ))}
    </>
  );
};

export default CharacterGrid;
