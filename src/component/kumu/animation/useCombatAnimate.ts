
import gsap from "gsap";
import { useCallback } from "react";
import { CharacterUnit, GridCell, WalkableNode } from "../service/CombatModels";


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
    const playUnSelect = useCallback(({ gridCells, walkables, timeline }: { gridCells: GridCell[][]; walkables?: WalkableNode[]; timeline: gsap.core.Timeline | null }) => {

        if (!walkables) return;

        const cells = walkables.map((c) => ({ ...c, ...gridCells[c.y][c.x] }));
        const tl = timeline ?? gsap.timeline();
        for (const cell of cells) {
            tl.to(cell.gridGround, { autoAlpha: 0, duration: 0.1 }, "<");
        }
        if (!timeline) {
            tl.play();
        } else
            console.log("play unselect")

    }, [])
    const playSelect = useCallback(({ gridCells, walkables, timeline }: { gridCells: GridCell[][]; walkables?: WalkableNode[]; timeline: gsap.core.Timeline | null }) => {

        if (!walkables) return;
        const cells = walkables.map((c) => ({ ...c, ...gridCells[c.y][c.x] }));
        const tl = timeline ?? gsap.timeline({ defaults: { ease: "none" }, autoRemoveChildren: false });
        let distance = 1;
        const maxDistance = Math.max(...cells.map(c => c.distance)); // 计算 cells 中最大 distance 值
        while (distance <= maxDistance) {  // 添加上限来防止无限循环
            const nodes = cells.filter((c) => c.distance === distance);
            nodes.forEach((node) => {
                const cell = gridCells[node.y][node.x];
                tl.to(cell.gridGround, { autoAlpha: node.level === 0 ? 0.3 : 0.6, duration: 0.7 }, "<");
            })

            if (nodes.length === 0) {
                break;
            } else
                tl.to({}, {}, ">-0.6");
            distance++;
        }
        if (!timeline) {
            tl.play();
        } else
            console.log("play select")

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
                duration: 0.2,
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

    return { playSelect, playUnSelect, playWalk, playInit, playTurnOver, playTurnReady }
}
export default useCombatAnimate