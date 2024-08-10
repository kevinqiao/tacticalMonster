import { CandyModel } from "../../model/CandyModel";
import { CellItem } from "../../model/CellItem";
const play = (cells: CellItem[], candyMap: Map<Number, CandyModel>, cellW: number, tl: any) => {

    // const tl = gsap.timeline();
    cells.forEach((c) => {
        const candy = candyMap.get(c.id)
        if (candy) {
            const sprite = candy.sprite
            if (sprite)
                tl.to(
                    sprite,
                    {
                        x: c.column * cellW + Math.floor(cellW / 2),
                        y: c.row * cellW + Math.floor(cellW / 2),
                        duration: 0.3,
                        ease: 'power2.out',
                    }, 0.2)
        }
    })

    // tl.play();

}
export default play