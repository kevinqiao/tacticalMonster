import { Coin, Diamond } from "component/icons/AssetIcons";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import React, { RefObject, useCallback, useEffect, useRef, useState } from "react";
import useEventSubscriber from "service/EventManager";

gsap.registerPlugin(MotionPathPlugin);
interface Props {
  diamondDivRef: RefObject<HTMLDivElement>;
  coinDivRef: RefObject<HTMLDivElement>;
  assets: { asset: number; amount: number }[];
}
const getRandomPath = (startX: number, startY: number, endX: number, endY: number) => {
  const deltaX = -Math.random() * 120;
  const deltaY = Math.random() * 130;
  const controlPoints = Array.from({ length: 3 }).map(() => ({
    x: Math.random() * deltaX - startX,
    y: Math.random() * deltaY - startY,
  }));
  return [
    { x: deltaX, y: deltaY },
    { x: endX - startX, y: endY - startY },
  ];
};
const AssetCollectAnimate: React.FC<Props> = ({ diamondDivRef, coinDivRef, assets }) => {
  const diamondSpritesRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const coinSpritesRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const [diamonds, setDiamonds] = useState<number[]>([]);
  const [coins, setCoins] = useState<number[]>([]);
  const { event } = useEventSubscriber(["assetCollected"], ["asset"]);
  const [allDiamondLoaded, setAllDiamondLoaded] = useState(false);
  const [allCoinLoaded, setAllCoinLoaded] = useState(false);
  useEffect(() => {
    gsap.to(maskRef.current, { duration: 0, autoAlpha: 0 });
    gsap.to(containerRef.current, { duration: 0, autoAlpha: 0 });
  }, []);
  useEffect(() => {
    if (event && maskRef.current && containerRef.current) {
      gsap.to(maskRef.current, { duration: 0, autoAlpha: 0.7 });
      gsap.to(containerRef.current, { duration: 0, autoAlpha: 1 });
      let index = 0;
      for (const reward of event.data) {
        setTimeout(() => {
          const { asset, amount } = reward;
          if (asset === 1) {
            diamondSpritesRef.current.clear();
            const ds = Array.from({ length: amount }).map((a, index) => index + 1);
            setDiamonds(ds);
          } else if (asset === 2) {
            coinSpritesRef.current.clear();
            const ds = Array.from({ length: amount }).map((a, index) => index + 1);
            setCoins(ds);
          }
        }, 400 * index++);
      }
    }
  }, [event, maskRef, containerRef]);
  useEffect(() => {
    if (diamonds.length > 0 && allDiamondLoaded) {
      play(1);
    }
  }, [diamonds, allDiamondLoaded]);
  useEffect(() => {
    if (coins.length > 0 && allCoinLoaded) {
      play(2);
    }
  }, [coins, allCoinLoaded]);
  const play = useCallback(
    (type: number) => {
      const assetDiv = type === 1 ? diamondDivRef.current : coinDivRef.current;
      const assetSprites = type === 1 ? diamondSpritesRef.current : coinSpritesRef.current;
      if (assetDiv && assetSprites.size > 0) {
        const asset = assets.find((a) => a.asset === type);
        console.log(asset);
        if (!asset) return;

        const dbound = (assetDiv as HTMLDivElement).getBoundingClientRect();
        const tl = gsap.timeline({
          onComplete: () => {
            gsap.to(maskRef.current, { duration: 0, autoAlpha: 0 });
            gsap.to(containerRef.current, { duration: 0, autoAlpha: 0 });
            tl.kill();
          },
        });
        const span = assetDiv.querySelector("span");
        for (const sprite of assetSprites.values()) {
          const ml = gsap.timeline({
            onComplete: () => {
              if (span) {
                span.innerHTML = ++asset.amount + "";
                gsap.to(span, {
                  duration: 0.5,
                  scale: 1.5,
                  onComplete: () => {
                    gsap.to(span, {
                      duration: 0.5,
                      scale: 1,
                    });
                  },
                });
              }
            },
          });
          tl.add(ml, "<");
          const bound = (sprite as HTMLDivElement).getBoundingClientRect();
          const path = getRandomPath(bound.left, bound.top, dbound.left, dbound.top);
          ml.fromTo(
            sprite,
            { scale: 0 },
            { scale: 1.6, autoAlpha: 1, duration: 0.5, ease: "slow(0.7,0.7,false)", delay: Math.random() * 1.2 }
          )
            .to(
              sprite,
              {
                duration: 1,
                scale: 0.7,
                autoAlpha: 0,
                motionPath: {
                  path: path,
                  align: "self",
                },
                ease: "power1.inOut",
              },
              ">"
            )
            .to(sprite, { duration: 0, x: 0, y: 0 }, ">");
        }
        tl.play();
      }
    },
    [assets, diamondDivRef, coinDivRef, diamondSpritesRef, coinSpritesRef]
  );

  const loadDiamond = useCallback(
    (k: number, el: HTMLDivElement | null) => {
      if (el) {
        diamondSpritesRef.current.set(k, el);
        if (diamondSpritesRef.current.size === diamonds.length) {
          setAllDiamondLoaded(true);
        }
      }
    },
    [diamonds]
  );
  const loadCoin = useCallback(
    (k: number, el: HTMLDivElement | null) => {
      if (el) {
        coinSpritesRef.current.set(k, el);
        if (coinSpritesRef.current.size === coins.length) {
          setAllCoinLoaded(true);
        }
      }
    },
    [coins]
  );

  return (
    <>
      <div
        ref={maskRef}
        style={{
          position: "absolute",
          zIndex: 10000,
          margin: 0,
          border: 0,
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          opacity: 0.6,
          backgroundColor: "black",
        }}
      ></div>

      <div
        ref={containerRef}
        style={{
          position: "absolute",
          zIndex: 10002,
          top: 0,
          left: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
        }}
      >
        <div style={{ position: "relative", top: 0, left: 0 }}>
          {diamonds.map((a, index) => (
            <div
              ref={(el) => loadDiamond(a, el)}
              key={a}
              style={{
                position: "absolute",
                top: (0.5 - Math.random()) * 200,
                left: (0.5 - Math.random()) * 200,
                width: 30,
                height: 30,
                opacity: 0,
              }}
            >
              <Diamond />
            </div>
          ))}
          {coins.map((a, index) => (
            <div
              ref={(el) => loadCoin(a, el)}
              key={a}
              style={{
                position: "absolute",
                top: (0.5 - Math.random()) * 200,
                left: (0.5 - Math.random()) * 200,
                width: 30,
                height: 30,
                opacity: 0,
              }}
            >
              <Coin />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default AssetCollectAnimate;
