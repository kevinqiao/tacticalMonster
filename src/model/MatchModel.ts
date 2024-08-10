import { CellItem } from "./CellItem";

export interface MatchModel {
    start: CellItem;
    end: CellItem;
    direction: number;
    size: number;
    asset: number;
}