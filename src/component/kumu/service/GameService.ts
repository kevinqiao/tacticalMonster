import { CombatAction } from "./model/CombatModels";
import { Game } from "./model/TMGameModel";

const createGame = () => {
    return;
}
const createRound = () => {
    return;
}
const createTurn = () => {
    return;
}
const createAction = (action: CombatAction, game: Game) => {
    return;
}
const completeAction = () => {
    return;
}
const completeTurn = () => {
    return;
}
const completeRound = () => {
    return;
}
const move = (uid: string, character: number, to: { x: number; y: number }, game: Game) => {
    //validate act
    //build action object
    return;
}
const defend = (uid: string, character: number, game: Game) => {
    return;
}
const standBy = (uid: string, character: number, game: Game) => {
    return;
}
const attack = (attacker: { uid: string, character: number }, attackees: { uid: string, character: number }[], game: Game) => {
    return;
}