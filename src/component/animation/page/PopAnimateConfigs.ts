export enum POP_DIRECTION {
    CENTER = 0,
    TOP = 1,
    RIGHT = 2,
    BOTTOM = 3,
    LEFT = 4

}
export interface AnimateConfig {
    id: number;
    direction: number;
    init: any;
    translate?: { scale?: number }
}
//termianl:(0:horization 1:vertical)-(0-desktop 1-pad 2-phone)

export const PopAnimates: AnimateConfig[] =
    [
        {
            id: 1,
            direction: POP_DIRECTION.LEFT,
            init: { width: "50%", height: "100%" },
        },
        {
            id: 2,
            direction: POP_DIRECTION.RIGHT,
            init: { width: "50%", height: "100%" },

        },
        {
            id: 3,
            direction: POP_DIRECTION.CENTER,
            init: { width: "50%", height: "100%", scale: 0.5 },
        },
        {
            id: 4,
            direction: POP_DIRECTION.RIGHT,
            init: { width: "100%", height: "100%" },

        },
        {
            id: 5,
            direction: POP_DIRECTION.BOTTOM,
            init: { width: "100%", height: "100%" },

        }
    ]
