import * as PIXI from 'pixi.js';

export class GoalItem extends PIXI.Container {
    asset: number;
    quantity: number;
    private candy: PIXI.Sprite;
    private text: PIXI.Text;

    constructor(texture: PIXI.Texture, asset: number, quantity: number, width: number, height: number) {
        super();
        this.quantity = quantity;
        this.asset = asset;
        this.width = width;
        this.height = height;
        this.candy = new PIXI.Sprite(texture);
        this.candy.anchor.set(0.5);
        this.candy.width = width;
        this.candy.height = width;
        this.candy.x = Math.floor(width / 2);
        this.candy.y = Math.floor(height / 2);
        this.addChild(this.candy as PIXI.DisplayObject);

        const textStyle = new PIXI.TextStyle({
            fontSize: Math.floor(width / 3),
            fill: 0x00ff00,
            fontWeight: 'bold',
            align: "center"
        });

        this.text = new PIXI.Text("16", textStyle);
        this.text.anchor.set(0.5)
        // Position the text (optional)
        this.text.x = width;
        this.text.y = height;
        this.addChild(this.text as PIXI.DisplayObject)

    }
    changeTxTStyle = (style: any) => {
        this.text.style = new PIXI.TextStyle(style)
    }

}
