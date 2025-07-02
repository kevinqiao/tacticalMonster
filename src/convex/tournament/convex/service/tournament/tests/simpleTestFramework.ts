/**
 * 简单测试框架 - 替代 Jest 在 Convex 环境中的功能
 * 提供完整的测试功能，无需 Jest 依赖
 */

// ==================== 简单断言函数 ====================

export function expect(actual: any) {
    return {
        toBe(expected: any) {
            if (actual !== expected) {
                throw new Error(`期望 ${actual} 等于 ${expected}`);
            }
        },

        toBeDefined() {
            if (actual === undefined || actual === null) {
                throw new Error(`期望值已定义，但得到 ${actual}`);
            }
        },

        toBeInstanceOf(constructor: any) {
            if (!(actual instanceof constructor)) {
                throw new Error(`期望 ${actual} 是 ${constructor.name} 的实例`);
            }
        },

        toContain(expected: any) {
            if (typeof actual === 'string') {
                if (!actual.includes(expected)) {
                    throw new Error(`期望字符串 "${actual}" 包含 "${expected}"`);
                }
            } else if (Array.isArray(actual)) {
                if (!actual.includes(expected)) {
                    throw new Error(`期望数组包含 ${expected}`);
                }
            } else {
                throw new Error('toContain 只能用于字符串或数组');
            }
        },

        toHaveBeenCalled() {
            if (typeof actual !== 'function' || !actual.mock) {
                throw new Error('期望一个 mock 函数被调用');
            }
            if (actual.mock.calls.length === 0) {
                throw new Error('期望函数被调用，但没有调用记录');
            }
        },

        toHaveBeenCalledWith(...args: any[]) {
            if (typeof actual !== 'function' || !actual.mock) {
                throw new Error('期望一个 mock 函数被调用');
            }
            const calls = actual.mock.calls;
            const found = calls.some((call: any) =>
                call.length === args.length &&
                call.every((arg: any, index: number) => {
                    if (typeof arg === 'object' && arg !== null) {
                        return JSON.stringify(arg) === JSON.stringify(args[index]);
                    }
                    return arg === args[index];
                })
            );
            if (!found) {
                throw new Error(`期望函数被调用，参数: ${JSON.stringify(args)}, 实际调用: ${JSON.stringify(calls)}`);
            }
        },

        toHaveBeenCalledTimes(times: number) {
            if (typeof actual !== 'function' || !actual.mock) {
                throw new Error('期望一个 mock 函数被调用');
            }
            if (actual.mock.calls.length !== times) {
                throw new Error(`期望函数被调用 ${times} 次，实际调用 ${actual.mock.calls.length} 次`);
            }
        },

        toBeLessThan(expected: number) {
            if (actual >= expected) {
                throw new Error(`期望 ${actual} 小于 ${expected}`);
            }
        },

        toBeLessThanOrEqual(expected: number) {
            if (actual > expected) {
                throw new Error(`期望 ${actual} 小于等于 ${expected}`);
            }
        },

        toBeGreaterThan(expected: number) {
            if (actual <= expected) {
                throw new Error(`期望 ${actual} 大于 ${expected}`);
            }
        },

        toBeGreaterThanOrEqual(expected: number) {
            if (actual < expected) {
                throw new Error(`期望 ${actual} 大于等于 ${expected}`);
            }
        },

        not: {
            toBe(expected: any) {
                if (actual === expected) {
                    throw new Error(`期望 ${actual} 不等于 ${expected}`);
                }
            },

            toBeDefined() {
                if (actual !== undefined && actual !== null) {
                    throw new Error(`期望值未定义，但得到 ${actual}`);
                }
            }
        },

        objectContaining(expected: any) {
            return {
                matches(actual: any) {
                    for (const key in expected) {
                        if (actual[key] !== expected[key]) {
                            throw new Error(`期望对象包含 ${key}: ${expected[key]}，实际: ${actual[key]}`);
                        }
                    }
                    return true;
                }
            };
        }
    };
}

// ==================== 增强的 Mock 函数 ====================

export function jest() {
    return {
        fn() {
            const mockFn = function (...args: any[]) {
                mockFn.mock.calls.push([...args]);

                // 如果有自定义实现，使用它
                if (mockFn.mock.implementation) {
                    const result = mockFn.mock.implementation(...args);
                    mockFn.mock.results.push({ value: result });
                    return result;
                }

                // 否则使用预设的结果
                const result = mockFn.mock.results[mockFn.mock.calls.length - 1];
                if (result?.value instanceof Promise) {
                    return result.value;
                }
                return result?.value;
            };

            mockFn.mock = {
                calls: [] as any[][],
                results: [] as { value: any }[],
                instances: [] as any[],
                implementation: null as Function | null
            };

            mockFn.mockResolvedValue = function (value: any) {
                mockFn.mock.results.push({ value: Promise.resolve(value) });
                return mockFn;
            };

            mockFn.mockRejectedValue = function (value: any) {
                mockFn.mock.results.push({ value: Promise.reject(value) });
                return mockFn;
            };

            mockFn.mockImplementation = function (impl: Function) {
                mockFn.mock.implementation = impl;
                return mockFn;
            };

            mockFn.mockReturnValue = function (value: any) {
                mockFn.mock.results.push({ value });
                return mockFn;
            };

            mockFn.mockClear = function () {
                mockFn.mock.calls = [];
                mockFn.mock.results = [];
                mockFn.mock.instances = [];
                return mockFn;
            };

            return mockFn;
        },

        spyOn(obj: any, method: string): any {
            const original = obj[method];
            const mockFn: any = jest().fn();
            obj[method] = mockFn;
            mockFn.mockRestore = () => {
                obj[method] = original;
            };
            return mockFn;
        },

        clearAllMocks() {
            // 简单实现，实际使用时可能需要更复杂的清理逻辑
        },

        doMock(modulePath: string, factory: () => any) {
            // 简单实现，实际使用时可能需要更复杂的模块模拟
            return factory();
        }
    };
}

// ==================== 测试运行器 ====================

export async function describe(name: string, fn: () => void | Promise<void>) {
    console.log(`\n📋 测试套件: ${name}`);
    try {
        await fn();
        console.log(`✅ ${name} - 通过`);
    } catch (error) {
        console.error(`❌ ${name} - 失败:`, error);
        throw error;
    }
}

export async function it(name: string, fn: () => void | Promise<void>) {
    console.log(`  🧪 ${name}`);
    try {
        await fn();
        console.log(`    ✅ ${name} - 通过`);
    } catch (error) {
        console.error(`    ❌ ${name} - 失败:`, error);
        throw error;
    }
}

export async function beforeEach(fn: () => void | Promise<void>) {
    await fn();
}

export async function afterEach(fn: () => void | Promise<void>) {
    await fn();
}

// ==================== 测试工具函数 ====================

export function assertEqual(actual: any, expected: any, message?: string) {
    if (actual !== expected) {
        throw new Error(message || `期望 ${actual} 等于 ${expected}`);
    }
}

export function assertDefined(value: any, message?: string) {
    if (value === undefined || value === null) {
        throw new Error(message || `期望值已定义，但得到 ${value}`);
    }
}

export function assertTrue(condition: boolean, message?: string) {
    if (!condition) {
        throw new Error(message || "期望条件为真");
    }
}

export function assertFalse(condition: boolean, message?: string) {
    if (condition) {
        throw new Error(message || "期望条件为假");
    }
}

export function assertThrows(fn: () => any, expectedError?: string) {
    try {
        fn();
        throw new Error("期望函数抛出错误，但没有抛出");
    } catch (error) {
        if (expectedError && !(error as Error).message.includes(expectedError)) {
            throw new Error(`期望错误包含 "${expectedError}"，但得到 "${(error as Error).message}"`);
        }
    }
}

export async function assertRejects(promise: Promise<any>, expectedError?: string) {
    try {
        await promise;
        throw new Error("期望 Promise 被拒绝，但没有被拒绝");
    } catch (error) {
        if (expectedError && !(error as Error).message.includes(expectedError)) {
            throw new Error(`期望错误包含 "${expectedError}"，但得到 "${(error as Error).message}"`);
        }
    }
}

// ==================== 导出 ====================

// jest 函数已经在上面定义，无需重复导出

// 添加独立的 objectContaining 函数
export function objectContaining(expected: any) {
    return {
        matches(actual: any) {
            for (const key in expected) {
                if (actual[key] !== expected[key]) {
                    throw new Error(`期望对象包含 ${key}: ${expected[key]}，实际: ${actual[key]}`);
                }
            }
            return true;
        }
    };
}

