import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { api } from '../../../_generated/api';

/**
 * 锦标赛测试运行器页面
 * 提供完整的测试管理和执行界面
 */
export function TestRunnerPage() {
    const [testConfig, setTestConfig] = useState({
        testTypes: ['unit', 'scenario'] as const,
        timeout: 30000,
        verbose: true
    });

    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 获取测试状态
    const testStatus = useQuery(api.service.tournament.tests.getTestStatus);
    const debugInfo = useQuery(api.service.tournament.tests.debugTestSystem);
    const testValidation = useQuery(api.service.tournament.tests.testRunUnifiedTests);

    // 运行测试的mutation
    const runTests = useMutation(api.service.tournament.tests.runUnifiedTests);

    const handleRunTests = async () => {
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const result = await runTests(testConfig);
            setResults(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : '未知错误');
        } finally {
            setLoading(false);
        }
    };

    const handleRunSpecificTest = async (testName: string) => {
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const result = await runTests({
                specificTests: [testName],
                timeout: 10000,
                verbose: true
            });
            setResults(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : '未知错误');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">🏆 锦标赛测试运行器</h1>

            {/* 系统状态 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800">测试状态</h3>
                    <p className="text-blue-600">{testStatus?.status || '加载中...'}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-800">函数验证</h3>
                    <p className="text-green-600">
                        {testValidation?.success ? '✅ 正常' : '❌ 异常'}
                    </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-800">调试信息</h3>
                    <p className="text-purple-600">
                        {debugInfo ? '✅ 可用' : '❌ 不可用'}
                    </p>
                </div>
            </div>

            {/* 测试配置 */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4">测试配置</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">测试类型</label>
                        <select
                            multiple
                            value={testConfig.testTypes}
                            onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                setTestConfig(prev => ({
                                    ...prev,
                                    testTypes: selected as any
                                }));
                            }}
                            className="w-full p-2 border rounded"
                        >
                            <option value="unit">单元测试</option>
                            <option value="integration">集成测试</option>
                            <option value="e2e">端到端测试</option>
                            <option value="performance">性能测试</option>
                            <option value="scenario">场景测试</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">超时时间 (ms)</label>
                        <input
                            type="number"
                            value={testConfig.timeout}
                            onChange={(e) => setTestConfig(prev => ({
                                ...prev,
                                timeout: parseInt(e.target.value) || 30000
                            }))}
                            className="w-full p-2 border rounded"
                        />
                    </div>
                </div>

                <div className="flex items-center mb-4">
                    <input
                        type="checkbox"
                        id="verbose"
                        checked={testConfig.verbose}
                        onChange={(e) => setTestConfig(prev => ({
                            ...prev,
                            verbose: e.target.checked
                        }))}
                        className="mr-2"
                    />
                    <label htmlFor="verbose" className="text-sm font-medium">详细输出</label>
                </div>

                <button
                    onClick={handleRunTests}
                    disabled={loading}
                    className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    {loading ? '运行中...' : '🚀 运行所有测试'}
                </button>
            </div>

            {/* 快速测试 */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold mb-4">快速测试</h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {testStatus?.availableTests?.map((testName: string) => (
                        <button
                            key={testName}
                            onClick={() => handleRunSpecificTest(testName)}
                            disabled={loading}
                            className="bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200 disabled:opacity-50"
                        >
                            {testName}
                        </button>
                    ))}
                </div>
            </div>

            {/* 错误显示 */}
            {error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
                    <h3 className="text-red-800 font-semibold mb-2">错误</h3>
                    <p className="text-red-600">{error}</p>
                </div>
            )}

            {/* 测试结果 */}
            {results && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4">测试结果</h2>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{results.result?.summary?.total || 0}</div>
                            <div className="text-sm text-gray-600">总测试</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{results.result?.summary?.passed || 0}</div>
                            <div className="text-sm text-gray-600">通过</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">{results.result?.summary?.failed || 0}</div>
                            <div className="text-sm text-gray-600">失败</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                {results.result?.summary?.successRate?.toFixed(1) || 0}%
                            </div>
                            <div className="text-sm text-gray-600">成功率</div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded">
                        <h3 className="font-semibold mb-2">详细信息</h3>
                        <pre className="text-sm overflow-auto">
                            {JSON.stringify(results, null, 2)}
                        </pre>
                    </div>
                </div>
            )}

            {/* 调试信息 */}
            {debugInfo && (
                <div className="bg-white p-6 rounded-lg shadow-md mt-6">
                    <h2 className="text-xl font-semibold mb-4">调试信息</h2>
                    <pre className="text-sm overflow-auto bg-gray-50 p-4 rounded">
                        {JSON.stringify(debugInfo, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

export default TestRunnerPage; 