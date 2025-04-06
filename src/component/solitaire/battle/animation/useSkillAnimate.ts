import { useCallback } from "react";
import { useUserManager } from "service/UserManager";
import { useCombatManager } from "../service/CombatManager";
import { useSprite } from "../service/SpriteProvider";
import { Skill } from "../types/PlayerTypes";
const useSkillAnimate = () => {
   const { game, boardDimension, direction } = useCombatManager();
   const { user } = useUserManager();
   const { spriteRefs, allSpritesLoaded } = useSprite();



   const playAskConfirmation = useCallback(({ skill, onComplete }: { skill: Skill, onComplete?: () => void }) => {
      if (!game) return;



   }, [spriteRefs, game, direction, allSpritesLoaded, boardDimension])

   return { playAskConfirmation }
}
export default useSkillAnimate;


