import * as PIXI from 'pixi.js';

export class CandySprite extends PIXI.Sprite {
    id: number;
    asset: number;
    column: number;
    row: number;
    status: number;
    constructor(texture: PIXI.Texture, id: number, asset: number, column: number, row: number, status?: number) {
        super(texture);
        this.id = id;
        this.asset = asset;
        this.column = column;
        this.row = row;
        this.status = status ?? 0;
    }

}
