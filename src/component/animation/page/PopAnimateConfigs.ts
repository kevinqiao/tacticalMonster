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
// export const PopAnimateConfigs = Object.freeze(
//     [
//         {
//             id: 1,
//             type: 0,
//             terminals: ["1-0", "1-1", "1-2", "0-0", "0-1", "0-2"],
//             from: { x: "100%", autoAlpha: 1 },
//             to: { x: 0, duration: 0.3 }
//         },
//         {
//             id: 2,
//             type: 1,
//             terminals: ["1-0", "1-1", "1-2", "0-0", "0-1", "0-2"],
//             to: { x: "100%", duration: 0.3 }
//         },
//         {
//             id: 3,
//             type: 1,
//             terminals: ["1-2"],
//             to: { scale: 0.7, autoAlpha: 0, duration: 0.3 }
//         }
//         ,
//         {
//             id: 4,
//             type: 0,
//             terminals: ["0-2", "0-1", "0-1"],
//             from: { x: "100%", autoAlpha: 1 },
//             to: { x: "100%", autoAlpha: 0, duration: 0.3 }
//         }

//     ]
// )
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
            init: { width: "50%", height: "100%" },
        },
        {
            id: 4,
            direction: POP_DIRECTION.RIGHT,
            init: { width: "100%", height: "100%" },

        },
        {
            id: 5,
            direction: POP_DIRECTION.BOTTOM,
            init: { width: "100%", height: "80%" },

        }
    ]
