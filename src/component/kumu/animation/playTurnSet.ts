import gsap from "gsap";
import { CharacterUnit, CombatTurn, GridCell } from "../service/CombatModels";
interface Props {
    currentTurn: CombatTurn;
    gridCells: GridCell[][];
    characters: CharacterUnit[];
}
const playTurnSet = ({ currentTurn, gridCells, characters }: Props) => {

    const character = characters.find((c) => c.id === currentTurn.character);
    if (character?.walkables) {
        const tl = gsap.timeline();
        character.walkables.forEach((w) => {
            const cell = gridCells[w.y][w.x];
            if (cell)
                tl.to(cell.gridGround, { autoAlpha: w.turnEnd ? 0.3 : 0.6, duration: 0.7 }, "<")
        });
        const { x, y } = character.position;
        const ground = gridCells[y][x];
        if (ground)
            tl.to(ground.gridStand, { autoAlpha: 1, duration: 0.7 }, ">=-0.3")
        tl.play();
    }
}
export default playTurnSet