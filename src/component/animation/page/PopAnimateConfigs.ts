//type:0-open 1-close
//termianl:(0:horization 1:vertical)-(0-desktop 1-pad 2-phone)
export const PopAnimateConfigs =
    [
        {
            id: 1,
            type: 0,
            terminals: ["1-2"],
            from: { scale: 1.0, top: "100%", autoAlpha: 1 },
            to: { top: 0, duration: 0.3 }
        },
        {
            id: 2,
            type: 1,
            terminals: ["1-2"],
            to: { top: "100%", duration: 0.3 }
        },
        {
            id: 3,
            type: 1,
            terminals: ["1-2"],
            to: { scale: 0.7, autoAlpha: 0, duration: 0.3 }
        }

    ]
