import React, { useEffect } from 'react';
import { useNavigationControl } from '../service/PageManager';

interface NavigationControlExampleProps {
    data?: { [key: string]: any };
    visible: number;
    close?: () => void;
}

const NavigationControlExample: React.FC<NavigationControlExampleProps> = ({
    data,
    visible,
    close
}) => {
    const { preventBackAndForward, allowBackAndForward } = useNavigationControl();

    // 当组件挂载时阻止导航
    useEffect(() => {
        if (visible) {
            preventBackAndForward();
            console.log('导航已被阻止 - 用户无法使用浏览器的前进/后退按钮');
        }

        // 清理函数：组件卸载时恢复导航
        return () => {
            allowBackAndForward();
            console.log('导航已恢复');
        };
    }, [visible, preventBackAndForward, allowBackAndForward]);

    const handleManualExit = () => {
        // 手动退出前先恢复导航
        allowBackAndForward();
        if (close) {
            close();
        }
    };

    if (!visible) return null;

    return (
        <div style={{
            padding: '20px',
            backgroundColor: '#f0f0f0',
            borderRadius: '8px',
            maxWidth: '600px',
            margin: '20px auto'
        }}>
            <h2>导航控制示例页面</h2>
            <p>这个页面演示了如何阻止浏览器的前进/后退功能：</p>

            <div style={{ backgroundColor: '#e8f4f8', padding: '15px', borderRadius: '4px', marginBottom: '15px' }}>
                <h3>当前状态：</h3>
                <ul>
                    <li>✅ 浏览器的前进/后退按钮被禁用</li>
                    <li>✅ 键盘快捷键（Alt+左箭头/右箭头）被阻止</li>
                    <li>✅ 鼠标侧键导航被阻止</li>
                </ul>
            </div>

            <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '4px', marginBottom: '15px' }}>
                <h3>测试方法：</h3>
                <ol>
                    <li>尝试点击浏览器的后退按钮</li>
                    <li>尝试使用 Alt + 左箭头快捷键</li>
                    <li>如果有鼠标侧键，尝试使用鼠标侧键导航</li>
                </ol>
                <p><strong>结果：</strong> 页面不会发生跳转，会保持在当前页面</p>
            </div>

            <div style={{ backgroundColor: '#d4edda', padding: '15px', borderRadius: '4px', marginBottom: '15px' }}>
                <h3>实现原理：</h3>
                <p>通过监听 <code>popstate</code> 事件，当检测到页面设置了 <code>preventNavigation</code> 标志时，
                    会使用 <code>history.replaceState</code> 将用户重新导航回当前页面，从而阻止页面跳转。</p>
                <p><strong>优化：</strong> 使用 <code>replaceState</code> 而不是 <code>pushState</code>，
                    避免在历史记录中添加新的条目，提供更好的用户体验。</p>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                    onClick={() => allowBackAndForward()}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    临时恢复导航
                </button>

                <button
                    onClick={() => preventBackAndForward()}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    重新阻止导航
                </button>

                <button
                    onClick={handleManualExit}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    正常退出页面
                </button>
            </div>

            <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
                <p><strong>注意：</strong> 当你点击"正常退出页面"按钮时，导航会先被恢复，然后页面才会关闭。</p>
                <p>这确保了用户可以正常使用浏览器导航功能回到之前的页面。</p>
            </div>
        </div>
    );
};

export default NavigationControlExample; 