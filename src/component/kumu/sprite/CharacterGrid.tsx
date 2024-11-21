import React, { useMemo } from "react";

import { useCombatManager } from "../service/CombatManager";
import CharacterCell from "./CharacterCell";

const CharacterGrid: React.FC = () => {
  const { characters } = useCombatManager();
  const render = useMemo(() => {
    console.log(characters);
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
