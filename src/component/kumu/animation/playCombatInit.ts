import gsap from "gsap";
import { CharacterUnit, GridCell } from "../service/model/CombatModels";

export const playInitPlaza = (gridCells: GridCell[][]) => {

    const tl = gsap.timeline();
    tl.to({}, {}, ">1")
    for (let row = 0; row < gridCells.length; row++) {
        for (let col = 0; col < gridCells[row].length; col++) {
            const cell = gridCells[row][col];
            if (cell.walkable || (cell.type && cell.type < 2))
                tl.to(cell.gridGround, { autoAlpha: 0.1, duration: 0.1 }, "<")
        }
    }
    tl.play();

}
export const playInitCharacters = (characters: CharacterUnit[]) => {
    const tl = gsap.timeline();
    for (const character of characters) {
        if (character.container)
            tl.to(character.container, { autoAlpha: 1, duration: 0.7 }, "<")
    }
    tl.play();

}
