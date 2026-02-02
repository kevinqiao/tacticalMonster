export interface Obstacle {
    id: string;
    asset: string;
    type?: number;
}
export interface ObstacleCell {
    id: string;
    r: number;
    q: number;
}
export interface ObstacleSprite extends ObstacleCell {
    element?: HTMLDivElement;
}