import { Tile } from "../../../../component/ludo/battle/types/CombatTypes";


export const tiles:Tile[]=[{
    x:6,
    y:4,
    type:0
},{
    x:8,
    y:5,
    type:0
},{
    x:3,
    y:6,
    type:0
},{
    x:5,
    y:8,
    type:0
}];
export const gameObj:any = { 
 
            tiles:tiles,
            seats: [
            { no: 0, tokens: [] },
            { no: 2, tokens: []},
            {
                no: 1,
                tokens: [
                    { id: 1, x: 8, y: 4 },
                    { id: 0, x: -1, y: -1 },
                    { id: 2, x: -1, y: -1 },
                    { id: 3, x: -1, y: -1 },
                ],
            },
            {
                no: 3,
                tokens: [
                    { id: 0, x: -1, y: -1 },
                    { id: 1, x: 6, y: 10 },
                    { id: 2, x: -1, y: -1 },
                    { id: 3, x: -1, y: -1 },
                ],
            }],
            status:-1
        };