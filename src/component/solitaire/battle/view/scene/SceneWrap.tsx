import React, { ReactNode, useEffect } from 'react';
import { useScene } from '../../service/CombatSceneProvider';
import "./style.css";
interface SceneWrapProps {
    id: string;
    children?: ReactNode;
    position?: { top: number; left: number; width: number; height: number };
}

const SceneWrap: React.FC<SceneWrapProps> = ({ id, children, position }) => {
    const { registerRef, markSceneLoaded } = useScene();
    const { ref } = registerRef(id, true);

    useEffect(() => {
        const divElement = ref.current;
        if (divElement) {
            const images = divElement.querySelectorAll('img');
            if (images.length > 0) {
                let loadedCount = 0;
                const handleLoad = () => {
                    loadedCount += 1;
                    if (loadedCount === images.length) {
                        markSceneLoaded(id); // 仅在图片加载完成时标记
                    }
                };
                images.forEach((img) => {
                    img.onload = handleLoad;
                    img.onerror = handleLoad;
                });

                return () => {
                    images.forEach((img) => {
                        img.onload = null;
                        img.onerror = null;
                    });
                };
            } else {
                markSceneLoaded(id); // 无图片时直接标记
            }
        }
    }, [id, markSceneLoaded, ref]);
    const renderChildren = (child: ReactNode, index: number, parentId: string): ReactNode => {
        if (React.isValidElement(child) && child.type === 'div') {
            const childProps = child.props as { id?: string; children?: ReactNode };
            const childId = childProps.id;
            if (childId) {
                // 只有定义了自定义 id 的子 div 才包装为 DivWithRef
                return (
                    <SceneWrap id={childId} key={childId}>
                        {React.Children.map(childProps.children, (grandChild, grandIndex) =>
                            renderChildren(grandChild, grandIndex, childId)
                        )}
                    </SceneWrap>
                );
            }
            // 无自定义 id 的 div 直接渲染，不包装
            return child;
        }
        return child;
    };

    return (
        <div ref={ref} className="scene" style={{ ...position }} >
            {React.Children.map(children, (child, index) => renderChildren(child, index, id))}
        </div>
    );
};

export default React.memo(SceneWrap);