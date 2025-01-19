import gsap from "gsap";
import { useEffect, useMemo } from "react";
import { PageContainer, usePageManager } from "service/PageManager";
import { EnterEffects } from "./effect/EnterEffects";
import { ExitEffects } from "./effect/ExitEffects";

const flattenContainers = (container: PageContainer) => {
    const result: PageContainer[] = [];

    // 定义递归函数
    const traverse = (currentContainer: PageContainer) => {
        result.push(currentContainer); // 将当前节点添加到结果数组

        // 遍历子节点
        currentContainer.children?.forEach(child => traverse(child));
    }

    traverse(container); // 开始遍历
    return result;
}
const closePrePage = (precontainer:PageContainer,currentcontainer:PageContainer,pageContainers:PageContainer[])=>{
    let container:PageContainer|null|undefined = precontainer;
    if(container?.children){
        const child = container.children.find((c)=>c.uri===currentcontainer.uri);
        if(child)
            container = null;
    }else if(precontainer?.parentURI){
        const preparent =  pageContainers.find((c) => c.uri === precontainer.parentURI);
        if(currentcontainer.uri.indexOf(precontainer.parentURI)<0)
             container = preparent;
    }
    if(container){
        const closeEffect = container?.animate?.close;
        if(typeof closeEffect === 'string' && closeEffect in ExitEffects) {
            const effectTl = ExitEffects[closeEffect]({
                    container: container,
                    params: {scale:0.5, autoAlpha:0, duration:0.7}
            });
            return effectTl;
        }      
    }
    return null;
}
const openCurrentPage = ({currentcontainer,precontainer,pageContainers}:{currentcontainer:PageContainer,precontainer?:PageContainer,pageContainers:PageContainer[]})=>{
    const effects:gsap.core.Timeline[]=[];
    if(currentcontainer.animate?.open){
        const parent = pageContainers.find((c) => c.uri === currentcontainer.parentURI);    
        const openEffect = EnterEffects[currentcontainer.animate.open]({
            container: currentcontainer,
            parent: parent,
            params: {scale:1, autoAlpha:1, duration:0.7}
        })
        if(openEffect) effects.push(openEffect);
    }

    if(currentcontainer.parentURI){
        console.log("parentURI",currentcontainer.parentURI)
        const parentContainer = pageContainers.find((c) => c.uri === currentcontainer.parentURI);
        console.log(parentContainer)
        console.log(precontainer)
        if(parentContainer&&(!precontainer||precontainer.uri.indexOf(parentContainer.uri)<0)){
            console.log("parentContainer",parentContainer)
            if(parentContainer.animate?.open){
                const openEffect = EnterEffects[parentContainer.animate.open]({
                    container: parentContainer,
                    params: {scale:1, autoAlpha:1, duration:0.7}
                })
                if(openEffect) effects.push(openEffect);
            }
        }
    } 
    return effects;
}
const usePageAnimate = () => {
    const { currentPage, pageContainers, changeEvent, containersLoaded } = usePageManager();
    const containers = useMemo(() => {
        if (pageContainers && containersLoaded)
            return pageContainers.map((c) => flattenContainers(c)).flat();
    }, [pageContainers, containersLoaded])

    useEffect(() => {

        if (changeEvent && containers && containersLoaded && currentPage) {
        
            const { type, prepage } = changeEvent;
            const precontainer:PageContainer|undefined = containers.find((c) =>prepage?.uri===c.uri);
            const currentcontainer = containers.find((c) => c.uri === currentPage.uri);
           
            if(!currentcontainer||!currentcontainer.ele) return;  
            const tl = gsap.timeline({
                onComplete: () => {
                    tl.kill();
                },
            });
            if(precontainer){
                const closeEffect = closePrePage(precontainer,currentcontainer,pageContainers);
                if(closeEffect) tl.add(closeEffect,"<");
            }
            const openEffects = openCurrentPage({currentcontainer,precontainer,pageContainers});
          
            if(openEffects) 
                openEffects.forEach((effect)=>tl.add(effect,"<"));
                      

            tl.play();

        }
    }, [containers, containersLoaded, currentPage, changeEvent]);

};
export default usePageAnimate