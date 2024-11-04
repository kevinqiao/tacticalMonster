import { HexNode } from "component/kumu/service/CombatModels";
import gsap from "gsap";
import { ActionProps } from "../playTurnAct";

const playWalk = ({ character, currentAction, gridCells, cellSize, setCurrentAction }: ActionProps) => {
    if (!currentAction || !gridCells) return;
    if (currentAction?.data && character?.container && character.walkables) {
        const to: { x: number; y: number } = currentAction.data as { x: number; y: number };
        const walkNode = character.walkables.find((w) => w.x === to.x && w.y === to.y);
        if (!walkNode) return;
        const tl = gsap.timeline({
            defaults: { ease: "power2.inOut" }, autoRemoveChildren: false, onComplete: () => {
                character.position = to;
                setCurrentAction((pre) => pre && pre.status === 1 ? { ...pre, status: 2 } : pre);
                tl.kill();
            }
        });

        const position = character.position;
        const ground = gridCells[position.y][position.x];
        if (ground)
            tl.set(ground.gridStand, { autoAlpha: 0 })
        const cells = character.walkables.map((c) => ({ ...c, ...gridCells[c.y][c.x] }));
        for (const cell of cells) {
            tl.to(cell.gridGround, { autoAlpha: 0.1, duration: 0.1 }, "<");
        }
        const positions = walkNode.path?.map(({ x, y }) => {
            const dx = y % 2 !== 0 ? x * cellSize + cellSize / 2 : x * cellSize;
            const dy = y * cellSize * 0.75;
            return { x: Math.floor(dx), y: Math.floor(dy) };
        });
        tl.to(character?.container, {
            motionPath: {
                path: positions,
                align: "self", // 将元素与路径对齐
                autoRotate: false, // 控制是否沿路径旋转
            },
            duration: 0.7
        }, "<");
        const nwalkables = currentAction.result?.walkables;
        if (nwalkables) {
            // tl.to({}, {}, "<")
            const destination = gridCells[to.y][to.x];
            if (destination.gridStand) {
                tl.to(destination.gridStand, { autoAlpha: 1 }, ">=-0.1")
            }
            // tl.to({}, {}, ">")
            nwalkables.forEach((w: HexNode) => {
                const cell = gridCells[w.y][w.x];
                if (cell)
                    tl.to(cell.gridGround, { autoAlpha: 0.6, duration: 0.5 }, "<")
            })
            character.walkables = nwalkables;
        }
        tl.play();
        console.log("play walk")
    }
}
export default playWalk