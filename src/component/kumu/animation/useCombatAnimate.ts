
import gsap from "gsap";
import { useCallback } from "react";
import { CharacterUnit, MapModel, PathCell } from "../service/CombatManager";
import { HexNode } from "../utils/Utlis";

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
    const playSelect = useCallback(({ unselects, walkables }: { unselects?: HexNode[]; walkables?: HexNode[] }) => {
        if (!pathCells || !walkables) return;
        let i = 0;
        const cells = walkables.map((c) => ({ ...c, ...pathCells[c.y][c.x] }));
        const tl = gsap.timeline();
        if (unselects) {
            i = 0;
            const ucells = unselects.map((c) => ({ ...c, ...pathCells[c.y][c.x] }));
            for (const cell of ucells) {
                if (i === 0)
                    tl.to(cell.container, { autoAlpha: 0.3, duration: 0.7 });
                else
                    tl.to(cell.container, { autoAlpha: 0.3, duration: 0.7 }, "<");
                i++;
            }

        }
        for (const cell of cells) {
            tl.to(cell.container, { autoAlpha: 1, duration: 0.7 }, i === 0 ? ">" : "<");
            i++;
        }

        tl.play();
        console.log(cells)
    }, [pathCells])

    return { playSelect, playInit }
}
export default useCombatAnimate