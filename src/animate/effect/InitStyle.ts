import gsap from "gsap";
import { PageContainer } from "service/PageManager";

interface InitStyle {
    (args: { container: PageContainer;parent?:PageContainer }): void;
}

interface InitStyles {
    [key: string]: InitStyle;
}

export const InitStyles: InitStyles = {
      slide: ({ parent, container }: { parent?: PageContainer, container: PageContainer }) => {
            if(!parent) return;
            // console.log("parent",parent)
            const index = parent.children?.findIndex((c) => c.name === container.name)

            if (container.ele && (typeof index !== "undefined")) {
            // console.log(container)
            gsap.set(container.ele, { left: `${index * 100}%` })
        }
    },
};
