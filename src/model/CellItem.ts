export interface CellItem {
    id: number;
    column: number;
    asset: number;
    src?: number;
    status?: number;//0-active 1-removed
    row: number;
}