import React, { CSSProperties, ReactNode, useCallback, useEffect, useMemo } from 'react';
import { useSprite } from '../../service/SpriteProvider';
import "./style.css";
interface SpriteWrapProps {
    id: string;
    children?: ReactNode;
    position?: CSSProperties;
}

const SpriteWrap: React.FC<SpriteWrapProps> = ({ id, children, position }) => {
    const { registerRef, markSpriteLoaded } = useSprite();
    const { ref } = registerRef(id, true);
    const dynamicStyle = useMemo((): CSSProperties => {
        return {
            ...(position || {}), // 完全依赖传入的 position
        };
    }, [position]);
    useEffect(() => {

        const divElement = ref.current;
        if (divElement) {
            const images = divElement.querySelectorAll('img');
            if (images.length > 0) {
                let loadedCount = 0;
                const handleLoad = () => {
                    loadedCount += 1;
                    if (loadedCount === images.length) {
                        markSpriteLoaded(id); // 仅在图片加载完成时标记
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
                markSpriteLoaded(id); // 无图片时直接标记
            }
        }
    }, [id, markSpriteLoaded, ref]);
    const renderChildren = useCallback((child: ReactNode, index: number, parentId: string): ReactNode => {
        // console.log(parentId, child)
        if (React.isValidElement(child) && child.type === 'div') {

            const childProps = child.props as { id?: string; children?: ReactNode, style?: CSSProperties };
            const childId = childProps.id;
            if (childId) {
                const childStyle = childProps.style || {};
                // 只有定义了自定义 id 的子 div 才包装为 DivWithRef
                return (
                    <SpriteWrap id={childId} key={childId} position={{ ...childStyle }}>
                        {React.Children.map(childProps.children, (grandChild, grandIndex) =>
                            renderChildren(grandChild, grandIndex, childId)
                        )}
                    </SpriteWrap>
                );
            }
            // 无自定义 id 的 div 直接渲染，不包装
            return child;
        }
        return child;
    }, []);

    const render = useMemo(() => (
        <div ref={ref} className="sprite-wrap" style={dynamicStyle} >
            {React.Children.map(children, (child, index) => renderChildren(child, index, id))}
        </div >
    ), [children, id, dynamicStyle, ref, renderChildren]);
    return render;
};

export default React.memo(SpriteWrap);