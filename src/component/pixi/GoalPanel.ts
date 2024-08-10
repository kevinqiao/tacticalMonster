import * as PIXI from 'pixi.js';
import { GoalItem } from './GoalItem';

export class GoalPanel extends PIXI.Container {
    private column: number;
    private goals: GoalItem[];
    pwidth: number;
    pheight: number;

    constructor(width: number, height: number, column: number) {
        super();
        this.pwidth = width;
        this.pheight = height;
        this.column = column;
        this.goals = [];
        this.interactive = true;
        this.on("mousemove", (event: any) => {
            console.log("mouse move on panel")
        })

    }
    public addItem = (texture: PIXI.Texture, asset: number, quantity: number) => {
        console.log(this.pwidth + ":" + this.pheight)
        const row = Math.floor(this.goals.length / this.column);
        const column = this.goals.length % this.column;
        const cwidth = Math.floor(this.pwidth / this.column);
        const goal = new GoalItem(texture, asset, quantity, cwidth * 0.6, cwidth * 0.6);
        goal.x = column * cwidth;
        goal.y = row * cwidth;
        this.goals.push(goal)
        this.addChild(goal as PIXI.DisplayObject)
    }

}
