// import gsap from "gsap";
// import { useCallback, useEffect, useMemo } from "react";
// import { useCombatManager } from "../service/CombatManager";
// import { CharacterUnit, CombatAction, CombatRound, CombatTurn, GridCell, HexNode, Player } from "../service/model/CombatModels";

// import playTurnSet from "./playTurnSet";

// interface Props {
//     cellSize: number;
//     gridMap: HexNode[][] | null;
//     gridCells: GridCell[][] | null;
//     players: Player[] | null;
//     currentRound: CombatRound | null;
//     currentTurn: CombatTurn | null;
//     currentAction: CombatAction | null;
//     resourceLoad: {
//         character: number;
//         gridContainer: number;
//         gridGround: number;
//         gridCover: number;
//         gridStand: number;
//         gridAttack: number;
//     } | null;
//     setCurrentRound: React.Dispatch<React.SetStateAction<CombatRound | null>>;
//     setCurrentTurn: React.Dispatch<React.SetStateAction<CombatTurn | null>>;
//     setCurrentAction: React.Dispatch<React.SetStateAction<CombatAction | null>>;

// }
// const useCombatAnimate = () => {
//     const { cellSize, resourceLoad, gridMap, gridCells, players, currentRound, currentTurn, currentAction, setCurrentTurn, setCurrentAction } = useCombatManager();

//     console.log("combat animate....")
//     console.log(currentTurn)
//     const characters = useMemo(() => {
//         if (players)
//             return players.reduce<CharacterUnit[]>((acc, cur) => [...acc, ...cur.characters], []);
//     }, [players])
//     const isResourceReady = resourceLoad ? Object.values(resourceLoad).every((value) => value === 1) : false
//     useEffect(() => {
//         if (!isResourceReady || !gridMap || !characters || !gridCells) return;
//         playCombatInit({ gridMap, gridCells, characters });
//     }, [characters, gridMap, gridCells, isResourceReady])

//     useEffect(() => {
//         if (!isResourceReady) return;
//         if (currentRound?.status === 0) {
//             playRoundStart();
//             console.log("play round start and set round statu=1")
//         } else if (currentRound?.status === 2)
//             playRoundOver();
//         console.log("play round over")

//     }, [currentRound, isResourceReady])

//     useEffect(() => {
//         if (!isResourceReady || !gridCells || !characters || !currentTurn) return;
//         if (currentTurn?.status === 0) {
//             const tl = gsap.timeline({
//                 onComplete: () => setCurrentTurn((pre) => pre ? { ...pre, status: 1 } : pre)
//             })
//             playTurnStart(tl);
//             tl.play();
//         } else if (currentTurn?.status === 2)
//             playTurnOver();
//         else if (currentTurn?.status === 1) {
//             playTurnSet({ currentTurn, characters, gridCells });
//         }

//     }, [currentTurn, gridCells, characters, isResourceReady])


//     useEffect(() => {

//         if (currentAction?.status === 0) {
//             const timeline = gsap.timeline({
//                 onComplete: () => {
//                     console.log("turn action complete")
//                     setCurrentAction((pre) => pre ? ({ ...pre, status: 1 }) : pre)
//                     timeline.kill();
//                 }
//             })
//             // playTurnAct(currentAction);
//             // playTurnAct({ action: currentAction, currentTurn, characters, gridCells, cellSize, timeline });
//             timeline.play();
//         }
//     }, [currentAction])

//     const playRoundStart = useCallback(() => {
//         console.log("play round start")
//     }, [])
//     const playRoundOver = useCallback(() => {
//         console.log("play round over")
//     }, [])
//     const playTurnStart = useCallback((timeline: gsap.core.Timeline) => {

//         console.log("play turn start")

//     }, [currentTurn])

//     const playTurnOver = useCallback(() => {
//         console.log("play turn over")
//     }, [currentTurn])

// }
// export default useCombatAnimate