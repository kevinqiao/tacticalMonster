import * as PIXI from 'pixi.js';
export const ARRAY_TYPE = {
    HORIZATION_LEFT: 1,
    HORIZATION_RIGHT: 2,
    VERTICAL_TOP: 3,
    VERTICAL_BOTTOM: 4
}
export class Avatar extends PIXI.Container {
    name: string;
    private avatar: PIXI.Sprite;
    private text: PIXI.Text;

    constructor(avatarTexture: PIXI.Texture, name: string, width: number, height: number) {
        super();
        this.name = name;
        this.width = width;
        this.height = height;


        this.avatar = new PIXI.Sprite(avatarTexture);
        this.avatar.anchor.set(0.5);
        this.avatar.width = width;
        this.avatar.height = width;
        this.avatar.x = Math.floor(width / 2);
        this.avatar.y = Math.floor(width / 2);
        this.addChild(this.avatar as PIXI.DisplayObject);

        const textStyle = new PIXI.TextStyle({
            fontSize: 12,
            fill: 0x00ff00,
            fontWeight: 'bold',
            align: "center"
        });

        this.text = new PIXI.Text(name, textStyle);
        this.text.anchor.set(0.5)
        // Position the text (optional)
        this.text.x = Math.floor(width / 2);
        this.text.y = width + (height - width) / 2;
        this.addChild(this.text as PIXI.DisplayObject)

    }
    changeTxTStyle = (style: any) => {
        this.text.style = new PIXI.TextStyle(style)
    }

}
