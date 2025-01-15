import { Engine } from 'json-rules-engine';
import { action } from "../_generated/server";
"use node";
// 创建规则引擎实例
const engine = new Engine();

// 定义规则
const rule1 = {
    conditions: {
        all: [
            {
                fact: 'age',
                operator: 'greaterThanInclusive',
                value: 18,
            },
            {
                fact: 'age',
                operator: 'lessThanInclusive',
                value: 25,
            },
            {
                fact: 'location',
                operator: 'equal',
                value: 'USA',
            },
        ],
    },
    event: {
        type: 'young-adult-in-usa',
        params: {
            message: 'User is a young adult in the USA.',
        },
    },
};
const rule2 = {
    conditions: {
        all: [
            {
                fact: 'age',
                operator: 'greaterThanInclusive',
                value: 28,
            },
            {
                fact: 'location',
                operator: 'equal',
                value: 'USA',
            },
        ],
    },
    event: {
        type: 'young-adult-in-usa',
        params: {
            message: 'User is a old adult in the USA.',
        },
    },
};

// 将规则添加到引擎
engine.addRule(rule1);
engine.addRule(rule2);

// 定义事实（数据）
const facts = {
    age: 22,
    location: 'USA',
};

// 运行引擎


export const executeRule = (age: number) => {
    facts.age = age;
    engine
        .run(facts)
        .then(({ events }) => {
            events.forEach((event) => console.log(event.params?.message));
        })
        .catch((err) => console.error(err));
}





export const doSomething = action({
    args: {},
    handler: () => {
        console.log("do something in convex")
        executeRule(30);
        console.log("rule executed")
    },
});