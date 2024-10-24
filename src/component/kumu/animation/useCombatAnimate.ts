
import gsap from "gsap";
import { useCallback } from "react";
import { CharacterUnit, GridCell, WalkableNode } from "../service/CombatManager";

const useCombatAnimate = () => {
    const playInit = useCallback((pathCells: GridCell[][], characters: CharacterUnit[], cellSize: number) => {
        console.log("play init...")
        if (!pathCells) return;
        const tl = gsap.timeline();
        for (const character of characters) {
            const { x, y } = character.position;
            const dx = y % 2 !== 0 ? x * cellSize + cellSize / 2 : x * cellSize;
            const dy = y * (cellSize * 0.75);
            if (character.container) {
                // console.log(character)
                tl.fromTo(character.container, { x: dx, y: dy, autoAlpha: 1, scale: 0.4 }, { scale: 0.6, duration: 1 }, "<");
            }
        }
        // let i = 0;
        // for (const character of characters) {
        //     const { x, y } = character.position;
        //     const cell = pathCells[y][x];
        //     if (cell) {
        //         tl.to(cell.gridCover, { pointerEvents: 'auto', autoAlpha: 1, duration: 0.7 }, i === 0 ? ">+0.4" : "<");
        //         i++;
        //     }
        // }
        tl.play();

    }, [])
    const playSelect = useCallback(({ gridCells, unselects, walkables }: { gridCells: GridCell[][], unselects?: WalkableNode[]; walkables?: WalkableNode[] }) => {

        if (!walkables) return;
        let i = 0;
        const cells = walkables.map((c) => ({ ...c, ...gridCells[c.y][c.x] }));
        const tl = gsap.timeline();
        // if (unselects && unselects.length > 0) {
        //     i = 0;
        //     const ucells = unselects.map((c) => ({ ...c, ...gridCells[c.y][c.x] }));
        //     for (const cell of ucells) {
        //         if (i === 0)
        //             tl.to(cell.gridContainer, { autoAlpha: 0.3, duration: 0.7 });
        //         else
        //             tl.to(cell.gridContainer, { autoAlpha: 0.3, duration: 0.7 }, "<");
        //         i++;
        //     }
        // }
        // console.log(cells)
        for (const cell of cells) {
            tl.to(cell.gridGround, { autoAlpha: cell.level === 0 ? 0.5 : 0.9, duration: 0.7 }, i === 0 ? ">" : "<");
            // tl.to(cell.gridCover, { pointerEvents: "auto" }, "<");
            i++;
        }

        tl.play();
        // console.log(cells)
    }, [])

    const playWalk = useCallback((character: CharacterUnit, path: { x: number; y: number }[], cellSize: number, timeline: gsap.core.Timeline | null) => {
        const ele = character.container;
        if (!ele) return;
        const tl = timeline ?? gsap.timeline({ defaults: { ease: "none" }, autoRemoveChildren: false });
        path.forEach(({ x, y }, index) => {
            const dx = y % 2 !== 0 ? x * cellSize + cellSize / 2 : x * cellSize;
            const dy = y * cellSize * 0.75;
            tl.to(ele, {
                x: Math.floor(dx),
                y: Math.floor(dy),
                duration: 0.5,
                onStart: () => {
                    console.log(`Moving to hex: (${x}, ${y})`);
                }
            });
        });

        tl.play();

    }, [])
    const playTurnOver = useCallback((gridCells: GridCell[][], character: CharacterUnit, timeline: gsap.core.Timeline | null) => {
        const tl = timeline ?? gsap.timeline();
        if (character.walkables) {
            character.walkables.forEach((node) => {
                const { x, y } = node;
                const cell = gridCells[y][x];
                tl.to(cell.gridGround, { autoAlpha: 0.3, duration: 0.4 })
            })
        }
        tl.play();

    }, [])
    const playTurnReady = useCallback((gridCells: GridCell[][], character: CharacterUnit, timeline: gsap.core.Timeline | null) => {
        const tl = timeline ?? gsap.timeline();
        if (character.walkables) {
            character.walkables.forEach((node) => {
                const { x, y } = node;
                const cell = gridCells[y][x];
                tl.to(cell.gridGround, { autoAlpha: 0.3, duration: 0.4 })
            })
        }
        tl.play();

    }, [])

    return { playSelect, playWalk, playInit, playTurnOver, playTurnReady }
}
export default useCombatAnimate