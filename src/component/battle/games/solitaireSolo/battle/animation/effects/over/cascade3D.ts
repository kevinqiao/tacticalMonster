/**
 * 3D弹跳效果 - 使用Three.js图层
 */

export const cascade3D = ({
    data,
    onComplete
}: {
    data: any;
    onComplete?: () => void;
}) => {
    console.log('🎬 Starting 3D bounce animation via Three.js layer');

    const { cards } = data;

    // 调用Three.js图层的启动方法
    const startThreeJsBounce = (window as any).__startThreeJsBounce;

    if (startThreeJsBounce) {
        startThreeJsBounce(cards);

        // 设置完成回调
        setTimeout(() => {
            console.log('✅ 3D bounce animation complete');
            onComplete?.();
        }, 8000); // 8秒后完成
    } else {
        console.warn('⚠️ Three.js layer not initialized');
        onComplete?.();
    }
};

