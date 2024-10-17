
import gsap from "gsap";
import { useCallback } from "react";
import { CharacterUnit, MapModel, PathCell } from "../service/CombatManager";
import { ReachableHexNode } from "../utils/Utlis";

const useCombatAnimate = (pathCells: PathCell[][] | null, map: MapModel) => {
    const playInit = useCallback((characters: CharacterUnit[]) => {
        if (!pathCells) return;
        const tl = gsap.timeline();
        const { size } = map
        for (const character of characters) {
            const { x, y } = character.position;
            const dx = y % 2 !== 0 ? x * (size + 2) + size / 2 : x * (size + 2);
            const dy = y * (size * 0.75 + 2);
            if (character.container) {
                console.log(character)
                tl.fromTo(character.container, { x: dx, y: dy, autoAlpha: 1, scale: 0.4 }, { scale: 1, duration: 1 }, "<");
            }
        }
        let i = 0;
        for (const character of characters) {
            const { x, y } = character.position;
            const cell = pathCells[y][x];
            if (cell) {
                tl.to(cell.cover, { autoAlpha: 1, duration: 0.7 }, i === 0 ? ">+0.4" : "<");
                i++;
            }
        }
        tl.play();

    }, [map, pathCells])
    const playSelectHero = useCallback(({ unselects, walkables }: { unselects?: ReachableHexNode[]; walkables?: ReachableHexNode[] }) => {
        if (!pathCells || !walkables) return;
        console.log(unselects)
        const cells = walkables.map((c) => ({ ...c, ...pathCells[c.y][c.x] }));
        console.log(cells)
    }, [pathCells])

    return { playSelectHero, playInit }
}
export default useCombatAnimate