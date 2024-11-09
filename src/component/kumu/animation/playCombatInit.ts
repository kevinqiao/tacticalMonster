import gsap from "gsap";
import { CharacterUnit, GridCell, HexNode } from "../service/model/CombatModels";
interface Props {
    gridMap: HexNode[][];
    gridCells: GridCell[][];
    characters: CharacterUnit[];
}
const playCombatInit = ({ gridMap, gridCells, characters }: Props) => {

    const tl = gsap.timeline();
    gridMap?.forEach((row) => {
        row.forEach((col) => {
            if (col.walkable || (col.type && col.type < 2)) {
                const cell = gridCells[col.y][col.x]
                tl.to(cell.gridGround, { autoAlpha: 0.1, duration: 0.1 }, "<")
            }
        })
    })

    for (const character of characters) {
        if (character.container)
            tl.to(character.container, { autoAlpha: 1, duration: 0.7 }, "<")
    }
    tl.play();

}
export default playCombatInit