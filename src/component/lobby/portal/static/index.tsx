import React, { useEffect, useRef } from "react";
import styles from "./index.module.css";

const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 960;

export default function Main() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const BG_URL = "https://cdn.codia.ai/projects/d1ead9b2-87ac-4c08-9455-e4b7252c0ac6/resource/portal_bg_16x9.png";

  useEffect(() => {
    const el = document.documentElement;
    el.style.backgroundImage = `url(${BG_URL})`;
    el.style.backgroundRepeat = "no-repeat";
    el.style.backgroundPosition = "center center";
    el.style.backgroundSize = "cover";
    return () => {
      el.style.backgroundImage = "";
      el.style.backgroundRepeat = "";
      el.style.backgroundPosition = "";
      el.style.backgroundSize = "";
    };
  }, []);

  useEffect(() => {
    function applyScale() {
      const container = containerRef.current;
      if (!container) return;

      const scaleX = window.innerWidth / DESIGN_WIDTH;
      const scaleY = window.innerHeight / DESIGN_HEIGHT;
      // Contain: take the smaller ratio so the whole design fits without clipping
      const scale = Math.min(scaleX, scaleY);

      // transform-origin: top left; translate by 50% of viewport to center
      const offsetX = (window.innerWidth - DESIGN_WIDTH * scale) / 2;
      const offsetY = (window.innerHeight - DESIGN_HEIGHT * scale) / 2;
      container.style.transform =
        `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    }

    applyScale();
    window.addEventListener("resize", applyScale);
    return () => window.removeEventListener("resize", applyScale);
  }, []);

  return (
    <>
      <div ref={wrapperRef} className={styles.scaleWrapper}>
      <div ref={containerRef} className={styles.mainContainer}>
        <div className={styles.groups}>
          <div className={styles.button}>
            <div className={styles.background}>
              <div className={styles.image} />
              <span className={styles.shop}>SHOP</span>
            </div>
          </div>
          <div className={styles.button1}>
            <div className={styles.background2}>
              <div className={styles.image3} />
              <span className={styles.signOut}>SignOut</span>
            </div>
          </div>
          <div className={styles.image4} />
        </div>
        <div className={styles.spacer} />
        <div className={styles.flexRowB}>
          <div className={styles.groups5}>
            <div className={styles.background6}>
              <div className={styles.flexRowEecd}>
                <div className={styles.image7} />
                <span className={styles.soloChallenge}>SOLO CHALLENGE</span>
                <span className={styles.number10}>10</span>
                <span className={styles.rank}>Rank:</span>
                <div className={styles.button8}>
                  <div className={styles.background9}>
                    <span className={styles.challenge}>CHALLENGE</span>
                  </div>
                </div>
              </div>
              <div className={styles.flexRowAf}>
                <div className={styles.buttonA}>
                  <div className={styles.backgroundB}>
                    <div className={styles.imageC} />
                    <span className={styles.rules}>RULES</span>
                  </div>
                </div>
                <div className={styles.buttonD}>
                  <div className={styles.backgroundE}>
                    <div className={styles.imageF} />
                    <span className={styles.leaderboard}>LEADERBOARD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.groups10}>
            <div className={styles.background11}>
              <div className={styles.flexRowD}>
                <div className={styles.image12} />
                <span className={styles.multiplayer}>MULTIPLAYER</span>
                <span className={styles.text12}>12</span>
                <span className={styles.rank13}>Rank:</span>
                <div className={styles.button14}>
                  <div className={styles.background15}>
                    <span className={styles.compete}>COMPETE</span>
                  </div>
                </div>
              </div>
              <div className={styles.flexRowB16}>
                <div className={styles.button17}>
                  <div className={styles.background18}>
                    <div className={styles.image19} />
                    <span className={styles.rules1a}>RULES</span>
                  </div>
                </div>
                <div className={styles.button1b}>
                  <div className={styles.background1c}>
                    <div className={styles.image1d} />
                    <span className={styles.leaderboard1e}>LEADERBOARD</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.spacer} />
        <div className={styles.flexRow}>
          <div className={styles.image1f}>
            <span className={styles.myHistory}>MY HISTORY</span>
            <div className={styles.groups20}>
              <div className={styles.background21}>
                <div className={styles.groups22}>
                  <div className={styles.background23}>
                    <div className={styles.button24}>
                      <div className={styles.background25}>
                        <span className={styles.plus}>+3</span>
                      </div>
                    </div>
                    <div className={styles.image26} />
                    <span className={styles.soloChallenge27}>Solo Challenge</span>
                  </div>
                </div>
                <span className={styles.timeAgo}>20m ago</span>
              </div>
            </div>
            <div className={styles.groups28}>
              <div className={styles.button29}>
                <div className={styles.background2a}>
                  <div className={styles.groups2b} />
                  <span className={styles.hAgo}>2h ago</span>
                </div>
              </div>
              <div className={styles.background2c}>
                <div className={styles.image2d} />
                <span className={styles.arena}>Arena</span>
              </div>
            </div>
            <div className={styles.flexRowD2e}>
              <span className={styles.more}>More</span>
              <div className={styles.image2f} />
            </div>
          </div>
          <div className={styles.image30} />
        </div>
        <div className={styles.image31} />
      </div>
      </div>
    </>
  );
}
