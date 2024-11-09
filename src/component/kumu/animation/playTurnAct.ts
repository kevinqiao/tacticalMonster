import { CharacterUnit, CombatAction, GridCell } from "../service/model/CombatModels";
export interface ActionProps {
    character: CharacterUnit, currentAction: CombatAction | null, gridCells: GridCell[][] | null, cellSize: number, setCurrentAction: React.Dispatch<React.SetStateAction<CombatAction | null>>;
}


const ACTION_NAMES: { [k: number]: string } = {
    1: "Walk",
    2: "Attack",
    3: "Stand",
    4: "Defend",
    5: "StandBy",
    6: "Skill"
}
export const playTurnAct = async (props: ActionProps): Promise<void> => {
    const { currentAction } = props;
    try {

        if (currentAction) {
            const actionName = ACTION_NAMES[currentAction.code];
            const operation = await import(`./actions/play${actionName}.ts`);
            operation.default(props); // 执行函数，但不需要接收返回值
        }
    } catch (error) {
        throw new Error(`Operation ${currentAction?.code} not found`);
    }
}
