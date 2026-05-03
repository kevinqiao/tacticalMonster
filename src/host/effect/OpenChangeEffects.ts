import { PageContainer } from "../service/PageManager";

interface OpenChangeEffect {
    (args: { container: PageContainer; precontainer: PageContainer; containers: PageContainer[]; onComplete?: () => void | Promise<void> }): void;
}

interface OpenChangeEffects {
    [key: string]: OpenChangeEffect;
}

export const OpenChangeEffects: OpenChangeEffects = {

    fade: ({ container, precontainer, containers, onComplete }) => {
        // console.log("container", container)
        if (!container.ele) return null;

    },

};
