import { useCallback } from "react";
import { MatchEvent } from "../EventProvider";

const useDragHandler = () => {


    const handleEvent = useCallback((event: MatchEvent) => {
        const { name, data } = event;

        switch (name) {
            case "skillTriggered":


                break;

            case "skillCompleted":


                break;
            default:

                break;
        }

    }, []);


    return { handleEvent };
};

export default useDragHandler;


