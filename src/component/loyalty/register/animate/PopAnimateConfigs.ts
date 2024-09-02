//type:0-open 1-close
//termianl:(0:horization 1:vertical)-(0-desktop 1-pad 2-phone)
export const PopAnimateConfigs =
    [
        {
            type: 0,
            terminals: ["1-2"],
            targets: ["orderReview", "orderItem"],
            from: { top: "100%", autoAlpha: 1 },
            to: { top: 0, duration: 0.3 }
        },
        {
            type: 0,
            terminals: ["1-2"],
            targets: ["orderAddition", "discount", "serviceCharge"],
            from: { top: 0, scale: 0.7, autoAlpha: 1 },
            to: { scale: 1.0, duration: 0.3 }
        },
        {
            type: 1,
            terminals: ["1-2"],
            targets: ["orderAddition", "discount", "serviceCharge"],
            to: { scale: 0.7, autoAlpha: 0, duration: 0.3 }
        }

    ]
