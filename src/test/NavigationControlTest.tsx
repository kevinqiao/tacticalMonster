import React, { useEffect, useState } from 'react';
import { useNavigationControl } from '../service/PageManager';

interface NavigationControlTestProps {
    data?: { [key: string]: any };
    visible: number;
    close?: () => void;
}

const NavigationControlTest: React.FC<NavigationControlTestProps> = ({
    data,
    visible,
    close
}) => {
    const { preventBackAndForward, allowBackAndForward } = useNavigationControl();
    const [isBlocked, setIsBlocked] = useState(false);
    const [testLog, setTestLog] = useState<string[]>([]);

    const addLog = (message: string) => {
        setTestLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const handleToggleBlock = () => {
        if (isBlocked) {
            allowBackAndForward();
            setIsBlocked(false);
            addLog('✅ 导航已恢复');
        } else {
            preventBackAndForward();
            setIsBlocked(true);
            addLog('🚫 导航已阻止');
        }
    };

    const handleClearLog = () => {
        setTestLog([]);
    };

    // 监听页面可见性变化
    useEffect(() => {
        if (visible) {
            addLog('📄 页面已加载');
        } else {
            addLog('📄 页面已隐藏');
        }
    }, [visible]);

    // 组件卸载时确保恢复导航
    useEffect(() => {
        return () => {
            if (isBlocked) {
                allowBackAndForward();
            }
        };
    }, [isBlocked, allowBackAndForward]);

    if (!visible) return null;

    return (
        <div style={{
            padding: '20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            maxWidth: '800px',
            margin: '20px auto',
            fontFamily: 'monospace'
        }}>
            <h2>🧪 导航控制功能测试</h2>

            <div style={{
                backgroundColor: isBlocked ? '#ffebee' : '#e8f5e8',
                padding: '15px',
                borderRadius: '4px',
                marginBottom: '20px',
                border: `2px solid ${isBlocked ? '#f44336' : '#4caf50'}`
            }}>
                <h3>当前状态：{isBlocked ? '🚫 导航已阻止' : '✅ 导航正常'}</h3>
                <p>
                    {isBlocked
                        ? '浏览器的前进/后退按钮现在被禁用。尝试使用它们，页面不会跳转。'
                        : '浏览器导航功能正常，可以自由使用前进/后退按钮。'
                    }
                </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={handleToggleBlock}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: isBlocked ? '#4caf50' : '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        marginRight: '10px'
                    }}
                >
                    {isBlocked ? '恢复导航' : '阻止导航'}
                </button>

                <button
                    onClick={handleClearLog}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: '#2196f3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        marginRight: '10px'
                    }}
                >
                    清空日志
                </button>

                {close && (
                    <button
                        onClick={() => {
                            if (isBlocked) {
                                allowBackAndForward();
                            }
                            close();
                        }}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#ff9800',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        关闭测试页面
                    </button>
                )}
            </div>

            <div style={{
                backgroundColor: '#fff',
                padding: '15px',
                borderRadius: '4px',
                marginBottom: '20px'
            }}>
                <h3>🔍 测试步骤：</h3>
                <ol>
                    <li>点击"阻止导航"按钮</li>
                    <li>尝试点击浏览器的后退按钮</li>
                    <li>尝试使用键盘快捷键（Alt + 左箭头）</li>
                    <li>如果有鼠标侧键，尝试使用鼠标导航</li>
                    <li>观察页面是否保持在当前位置</li>
                    <li>点击"恢复导航"按钮测试恢复功能</li>
                </ol>
            </div>

            <div style={{
                backgroundColor: '#fff',
                padding: '15px',
                borderRadius: '4px',
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid #ddd'
            }}>
                <h3>📊 操作日志：</h3>
                {testLog.length === 0 ? (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>暂无操作记录</p>
                ) : (
                    <div>
                        {testLog.map((log, index) => (
                            <div key={index} style={{
                                padding: '4px 0',
                                borderBottom: '1px solid #eee',
                                fontSize: '14px'
                            }}>
                                {log}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#fff3cd',
                borderRadius: '4px',
                fontSize: '14px'
            }}>
                <h4>💡 技术说明：</h4>
                <ul>
                    <li>使用 <code>history.replaceState</code> 而不是 <code>pushState</code></li>
                    <li>不会在浏览器历史记录中添加额外的条目</li>
                    <li>通过状态计数器确保导航阻止的可靠性</li>
                    <li>支持所有类型的历史导航（按钮、快捷键、鼠标侧键等）</li>
                </ul>
            </div>
        </div>
    );
};

export default NavigationControlTest; 