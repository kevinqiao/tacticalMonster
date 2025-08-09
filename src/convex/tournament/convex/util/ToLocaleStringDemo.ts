// ============================================================================
// Date.toLocaleString() 详细演示
// ============================================================================

console.log('=== Date.toLocaleString() 详细演示 ===\n');

const sampleDate = new Date('2025-01-27T14:30:45.123Z'); // UTC 时间

// 1. 基本用法
console.log('1. 基本用法:');
console.log('原始 UTC 时间:', sampleDate.toISOString());
console.log('默认格式:', sampleDate.toLocaleString());
console.log('美国格式:', sampleDate.toLocaleString('en-US'));
console.log('中国格式:', sampleDate.toLocaleString('zh-CN'));
console.log('英国格式:', sampleDate.toLocaleString('en-GB'));
console.log('德国格式:', sampleDate.toLocaleString('de-DE'));
console.log('日本格式:', sampleDate.toLocaleString('ja-JP'));
console.log('');

// 2. 时区转换 (这是关键!)
console.log('2. 时区转换:');
console.log('UTC 时间:', sampleDate.toLocaleString('en-US', { timeZone: 'UTC' }));
console.log('多伦多时间:', sampleDate.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
console.log('东京时间:', sampleDate.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
console.log('伦敦时间:', sampleDate.toLocaleString('en-US', { timeZone: 'Europe/London' }));
console.log('上海时间:', sampleDate.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
console.log('悉尼时间:', sampleDate.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
console.log('');

// 3. 详细格式化选项
console.log('3. 详细格式化选项:');

// 完整日期时间格式
const fullOptions = {
    timeZone: 'America/Toronto',
    year: 'numeric' as const,
    month: 'long' as const,
    day: 'numeric' as const,
    weekday: 'long' as const,
    hour: '2-digit' as const,
    minute: '2-digit' as const,
    second: '2-digit' as const,
    hour12: false,
    timeZoneName: 'short' as const
};

console.log('完整格式 (多伦多):', sampleDate.toLocaleString('en-US', fullOptions));

// 只显示日期
const dateOnlyOptions = {
    timeZone: 'America/Toronto',
    year: 'numeric' as const,
    month: '2-digit' as const,
    day: '2-digit' as const
};

console.log('只显示日期:', sampleDate.toLocaleString('en-CA', dateOnlyOptions));

// 只显示时间
const timeOnlyOptions = {
    timeZone: 'America/Toronto',
    hour: '2-digit' as const,
    minute: '2-digit' as const,
    second: '2-digit' as const,
    hour12: false
};

console.log('只显示时间:', sampleDate.toLocaleString('en-US', timeOnlyOptions));
console.log('');

// 4. 在 TimeZoneUtils 中的实际应用
console.log('4. 在 TimeZoneUtils 中的实际应用:');

// 模拟 TimeZoneUtils 中的方法
function getTimeZoneISO_Demo(timeZone: string = 'America/Toronto'): string {
    const now = new Date();
    // 关键步骤：使用 toLocaleString 转换时区，然后创建新的 Date 对象
    const localTimeString = now.toLocaleString("en-US", { timeZone: timeZone });
    const localDate = new Date(localTimeString);
    return localDate.toISOString();
}

function getTimeZoneOffsetMinutes_Demo(timeZone: string): number {
    const now = new Date();
    // 获取指定时区的时间
    const timeZoneDate = new Date(now.toLocaleString("en-US", { timeZone }));
    // 获取 UTC 时间
    const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
    // 计算偏移量
    const offsetMs = timeZoneDate.getTime() - utcDate.getTime();
    return offsetMs / (1000 * 60);
}

function getCurrentDate_Demo(timeZone: string): string {
    const now = new Date();
    // 使用 toLocaleDateString 获取指定时区的日期
    return now.toLocaleDateString("en-CA", {
        timeZone: timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

console.log('演示 TimeZoneUtils 方法:');
console.log('多伦多 ISO:', getTimeZoneISO_Demo('America/Toronto'));
console.log('东京 ISO:', getTimeZoneISO_Demo('Asia/Tokyo'));
console.log('多伦多偏移分钟:', getTimeZoneOffsetMinutes_Demo('America/Toronto'));
console.log('东京偏移分钟:', getTimeZoneOffsetMinutes_Demo('Asia/Tokyo'));
console.log('多伦多当前日期:', getCurrentDate_Demo('America/Toronto'));
console.log('东京当前日期:', getCurrentDate_Demo('Asia/Tokyo'));
console.log('');

// 5. 不同语言环境的格式差异
console.log('5. 不同语言环境的格式差异:');
const timeZones = ['America/Toronto', 'Asia/Tokyo', 'Europe/London'];
const locales = ['en-US', 'zh-CN', 'ja-JP', 'de-DE', 'fr-FR'];

timeZones.forEach(tz => {
    console.log(`\n${tz} 在不同语言环境下的表示:`);
    locales.forEach(locale => {
        const formatted = sampleDate.toLocaleString(locale, { timeZone: tz });
        console.log(`  ${locale}: ${formatted}`);
    });
});

// 6. 月份和星期的本地化
console.log('\n6. 月份和星期的本地化:');
const localizationOptions = {
    timeZone: 'America/Toronto',
    year: 'numeric' as const,
    month: 'long' as const,
    day: 'numeric' as const,
    weekday: 'long' as const
};

console.log('英文:', sampleDate.toLocaleString('en-US', localizationOptions));
console.log('中文:', sampleDate.toLocaleString('zh-CN', localizationOptions));
console.log('日文:', sampleDate.toLocaleString('ja-JP', localizationOptions));
console.log('德文:', sampleDate.toLocaleString('de-DE', localizationOptions));
console.log('法文:', sampleDate.toLocaleString('fr-FR', localizationOptions));
console.log('');

// 7. 12/24小时制的差异
console.log('7. 12/24小时制的差异:');
const hour12Options = {
    timeZone: 'America/Toronto',
    hour: '2-digit' as const,
    minute: '2-digit' as const,
    second: '2-digit' as const,
    hour12: true
};

const hour24Options = {
    timeZone: 'America/Toronto',
    hour: '2-digit' as const,
    minute: '2-digit' as const,
    second: '2-digit' as const,
    hour12: false
};

console.log('12小时制:', sampleDate.toLocaleString('en-US', hour12Options));
console.log('24小时制:', sampleDate.toLocaleString('en-US', hour24Options));
console.log('');

// 8. 时区名称显示选项
console.log('8. 时区名称显示选项:');
const timeZoneNameOptions = [
    { timeZoneName: 'short' as const, desc: 'short' },
    { timeZoneName: 'long' as const, desc: 'long' },
    { timeZoneName: 'shortOffset' as const, desc: 'shortOffset' },
    { timeZoneName: 'longOffset' as const, desc: 'longOffset' }
];

timeZoneNameOptions.forEach(({ timeZoneName, desc }) => {
    try {
        const result = sampleDate.toLocaleString('en-US', {
            timeZone: 'America/Toronto',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: timeZoneName
        });
        console.log(`${desc}:`, result);
    } catch (error) {
        console.log(`${desc}: 不支持`);
    }
});
console.log('');

// 9. 边界情况和注意事项
console.log('9. 边界情况和注意事项:');

// 夏令时边界
const dstDate = new Date('2025-03-09T07:00:00Z'); // 美国夏令时开始附近
console.log('夏令时期间 (多伦多):', dstDate.toLocaleString('en-US', { timeZone: 'America/Toronto' }));

const nonDstDate = new Date('2025-01-15T07:00:00Z'); // 标准时间
console.log('标准时间 (多伦多):', nonDstDate.toLocaleString('en-US', { timeZone: 'America/Toronto' }));

// 跨日期的情况
const lateNight = new Date('2025-01-27T23:30:00Z');
console.log('UTC 深夜:', lateNight.toLocaleString('en-US', { timeZone: 'UTC' }));
console.log('多伦多时间:', lateNight.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
console.log('东京时间:', lateNight.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
console.log('');

// 10. 性能和最佳实践
console.log('10. 性能和最佳实践:');

console.log('最佳实践建议:');
console.log('1. 缓存格式化选项对象以提高性能');
console.log('2. 使用 en-CA 获取 YYYY-MM-DD 格式的日期');
console.log('3. 使用 en-US 进行时区转换以获得一致的解析结果');
console.log('4. 避免在循环中重复创建选项对象');
console.log('5. 注意夏令时转换期间的边界情况');

// 性能测试示例
const performanceOptions = {
    timeZone: 'America/Toronto',
    year: 'numeric' as const,
    month: '2-digit' as const,
    day: '2-digit' as const
};

console.log('\n性能优化示例:');
console.log('❌ 不好的做法 - 每次都创建新选项:');
console.log('for (let i = 0; i < 1000; i++) {');
console.log('  date.toLocaleString("en-CA", { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" });');
console.log('}');

console.log('\n✅ 好的做法 - 重用选项对象:');
console.log('const options = { timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit" };');
console.log('for (let i = 0; i < 1000; i++) {');
console.log('  date.toLocaleString("en-CA", options);');
console.log('}');

console.log('\n=== Date.toLocaleString() 演示完成 ==='); 