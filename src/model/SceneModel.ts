import * as PIXI from "pixi.js";
import { CandySprite } from "../component/pixi/CandySprite";
export interface SceneModel {
    // container?: HTMLDivElement;
    app: PIXI.Application | HTMLDivElement | null;
    type?: number;//0-PIXI.Application 1-HTMLDIVELEMENT
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface GameScene extends SceneModel {
    gameId: string;
    cwidth: number;
    cheight: number;
    column: number;
    row: number;
    candies: Map<number, CandySprite>;
    mode: number;//
}

export interface SearchScene {
    containerEle: HTMLDivElement;
    searchEle: HTMLDivElement;
}

export interface BattleConsoleScene extends SceneModel {
    gameConsoles: GameConsoleScene[];
}
export interface GameConsoleScene {
    gameId: string;
    avatar?: HTMLElement;
    bar?: HTMLElement;
    score?: HTMLElement;
    plus?: HTMLElement;
    goals?: { asset: number; iconEle?: HTMLElement; qtyEle?: HTMLElement }[];
    moves?: HTMLElement;
}