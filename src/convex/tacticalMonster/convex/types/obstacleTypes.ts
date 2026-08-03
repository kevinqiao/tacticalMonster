export interface Obstacle {
    id: string;
    asset: string;
    type?: number;
    walkable?: boolean;
}
export interface ObstacleCell {
    id: string;
    r: number;
    q: number;
}
export interface ObstacleSprite extends ObstacleCell {
    element?: HTMLDivElement;
}