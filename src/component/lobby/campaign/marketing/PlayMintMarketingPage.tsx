import React, { useEffect, useState } from "react";

import { PageProp } from "host/RenderApp";

import "./playmint.css";

const MERCHANT_URL = "/campaign/merchant";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const PlayMintMarketingPage: React.FC<PageProp> = ({ visible }) => {
  const [headerScrolled, setHeaderScrolled] = useState(false);

  useEffect(() => {
    if (visible === 0) return;
    document.title = "PlayMint — Skill campaigns + Wallet rewards for local shops.";
    const onScroll = () => setHeaderScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [visible]);

  if (visible === 0) return null;

  return (
    <div className="playmint">
      <a className="playmint__skip" href="#main">
        Skip to content
      </a>

      <header className={`playmint-header${headerScrolled ? " is-scrolled" : ""}`}>
        <div className="playmint-header__inner">
          <a className="playmint-logo" href="/campaign/home" aria-label="PlayMint home">
            <span className="playmint-logo__mark" aria-hidden="true">
              P
            </span>
            <span>
              PlayMint<span className="playmint-logo__dot">.</span>
            </span>
          </a>

          <nav className="playmint-nav" aria-label="Primary">
            <a href="#why">Why PlayMint</a>
            <a href="#how">How it works</a>
            <a href="#compare">Compare</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="playmint-header__actions">
            <a className="playmint-btn playmint-btn--ghost" href={MERCHANT_URL}>
              Merchant login
            </a>
            <a className="playmint-btn playmint-btn--primary" href={MERCHANT_URL}>
              Start free
            </a>
          </div>
        </div>
      </header>

      <main id="main" className="playmint-main">
        <section className="playmint-hero">
          <div>
            <span className="playmint-eyebrow">Skill campaigns + Apple &amp; Google Wallet</span>
            <h1>Enhance loyalty — play, win, keep it in Wallet.</h1>
            <p className="playmint-hero__lead">
              Guests scan a table tent, play a skill challenge, and earn a reward that installs to
              Apple or Google Wallet. Keep Square Loyalty for points — PlayMint owns wait-time,
              slow hours, and win-back bursts. No customer app download.
            </p>
            <div className="playmint-hero__cta">
              <a className="playmint-btn playmint-btn--mint" href={MERCHANT_URL}>
                Start free pilot
              </a>
              <button
                type="button"
                className="playmint-btn playmint-btn--ghost"
                onClick={() => scrollToId("how")}
              >
                See how it works
              </button>
            </div>
            <p className="playmint-hero__fine">
              ~90 min first setup · Merchants don&apos;t need Apple or Google developer accounts
            </p>
          </div>

          <div className="playmint-hero__visual" aria-hidden="true">
            <div className="playmint-phone playmint-phone--left">
              <div className="playmint-phone__bar" />
              <div className="playmint-phone__game">Solitaire Challenge</div>
              <div className="playmint-phone__coupon">Score 800+ → 15% off</div>
            </div>
            <div className="playmint-phone playmint-phone--right">
              <div className="playmint-phone__bar" />
              <div className="playmint-phone__wallet">
                <span className="playmint-phone__wallet-badge">Wallet</span>
                <span>15% off · tap to redeem</span>
                <span style={{ opacity: 0.75, fontWeight: 600 }}>On lock screen, not in camera roll</span>
              </div>
            </div>
          </div>
        </section>

        <div className="playmint-strip">
          <div className="playmint-strip__inner">
            <p className="playmint-strip__label">Built to work with</p>
            <div className="playmint-partners">
              <span className="playmint-partner is-live">
                <span className="playmint-partner__badge">Live</span> Skill campaigns + QR redeem
              </span>
              <span className="playmint-partner is-live">
                <span className="playmint-partner__badge">Live</span> PassKit · Wallet delivery
              </span>
              <span className="playmint-partner is-soon">
                <span className="playmint-partner__badge">Soon</span> Square POS discount
              </span>
              <span className="playmint-partner is-soon">
                <span className="playmint-partner__badge">Soon</span> Clover
              </span>
            </div>
          </div>
        </div>

        <section className="playmint-stats" aria-label="Highlights">
          <div className="playmint-stat">
            <div className="playmint-stat__num">Skill</div>
            <div className="playmint-stat__label">Earned rewards — not pure spin-to-win luck</div>
          </div>
          <div className="playmint-stat">
            <div className="playmint-stat__num">Wallet</div>
            <div className="playmint-stat__label">Passes via PassKit — lock-screen visibility</div>
          </div>
          <div className="playmint-stat">
            <div className="playmint-stat__num">4+</div>
            <div className="playmint-stat__label">Game templates + leaderboard campaigns</div>
          </div>
          <div className="playmint-stat">
            <div className="playmint-stat__num">POS+</div>
            <div className="playmint-stat__label">Enhance Square / Clover loyalty — don&apos;t replace</div>
          </div>
        </section>

        <section id="why" className="playmint-section playmint-section--alt">
          <div className="playmint-section__inner">
            <p className="playmint-section__eyebrow">Why PlayMint + PassKit</p>
            <h2>Campaign brain meets Wallet delivery — a sharper pitch for merchants.</h2>
            <p className="playmint-section__lead">
              QR-only coupons feel temporary. Wallet passes feel official. Together, you sell
              engagement that stays on the lock screen — with skill gates so reward cost stays
              predictable.
            </p>
            <div className="playmint-features">
              <article className="playmint-feature">
                <h3>Enhance, don&apos;t replace</h3>
                <p>
                  Square Rewards or punch cards stay. PlayMint adds timed campaigns for wait-time,
                  slow dayparts, and lapsed members.
                </p>
              </article>
              <article className="playmint-feature">
                <h3>Skill-gated rewards</h3>
                <p>
                  Score thresholds, daily play limits, and coupon caps — margin-friendly vs
                  luck-first wallet games.
                </p>
              </article>
              <article className="playmint-feature">
                <h3>Wallet-native (PassKit)</h3>
                <p>
                  One-tap Add to Apple / Google Wallet. Merchants never register with Google —
                  we issue passes from one platform account.
                </p>
              </article>
              <article className="playmint-feature">
                <h3>Lock-screen retention</h3>
                <p>
                  Rewards live next to payment cards — not buried in screenshots. Expiry and
                  geo push where you configure them.
                </p>
              </article>
              <article className="playmint-feature">
                <h3>Self-serve merchant hub</h3>
                <p>
                  Campaigns, coupon types, branded H5, table-tent QR, Wallet links, and staff
                  redeem — minutes, not weeks.
                </p>
              </article>
              <article className="playmint-feature">
                <h3>Full funnel metrics</h3>
                <p>
                  Play → issue → Wallet install → redeem. Prove which campaigns drive return
                  visits, not just &quot;feels fun.&quot;
                </p>
              </article>
            </div>

            <div className="playmint-usecases" style={{ marginTop: "2.5rem" }}>
              <article className="playmint-usecase">
                <span className="playmint-usecase__icon" aria-hidden="true">
                  ⏱
                </span>
                <div>
                  <h3>Wait-time wedge</h3>
                  <p>Turn 3–8 minute waits into first-touch play — foot in the door for new guests.</p>
                </div>
              </article>
              <article className="playmint-usecase">
                <span className="playmint-usecase__icon" aria-hidden="true">
                  📅
                </span>
                <div>
                  <h3>Slow-day fill</h3>
                  <p>Time-box coupons to Tue afternoons or rainy days without burning core loyalty budget.</p>
                </div>
              </article>
              <article className="playmint-usecase">
                <span className="playmint-usecase__icon" aria-hidden="true">
                  🔔
                </span>
                <div>
                  <h3>Lapsed member wake-up</h3>
                  <p>Challenge links for dormant loyalty members — win a Wallet coupon, come back in-store.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="how" className="playmint-section">
          <p className="playmint-section__eyebrow">How it works</p>
          <h2>From scan to repeat visit, in five steps.</h2>
          <p className="playmint-section__lead">
            PlayMint sits above your POS and loyalty stack. PassKit delivers the pass — your
            coupon code stays the source of truth for redemption.
          </p>
          <div className="playmint-steps">
            <article className="playmint-step">
              <span className="playmint-step__num">1</span>
              <div>
                <h3>Scan the table tent</h3>
                <p>Branded H5 campaign — no app store, no account required.</p>
              </div>
            </article>
            <article className="playmint-step">
              <span className="playmint-step__num">2</span>
              <div>
                <h3>Play a skill challenge</h3>
                <p>Solitaire, match-3, block blast, or leaderboard — you set the game and rules.</p>
              </div>
            </article>
            <article className="playmint-step">
              <span className="playmint-step__num">3</span>
              <div>
                <h3>Win → coupon issued</h3>
                <p>Hit the threshold; unique code capped per day and per campaign.</p>
              </div>
            </article>
            <article className="playmint-step">
              <span className="playmint-step__num">4</span>
              <div>
                <h3>Add to Apple / Google Wallet</h3>
                <p>PassKit issues the pass — barcode matches your code for staff scan at counter.</p>
              </div>
            </article>
            <article className="playmint-step">
              <span className="playmint-step__num">5</span>
              <div>
                <h3>Redeem &amp; sync</h3>
                <p>Staff web redeem or pass scan today. Square auto-discount on the roadmap.</p>
              </div>
            </article>
          </div>
        </section>

        <section id="games" className="playmint-section playmint-section--alt">
          <div className="playmint-section__inner">
            <p className="playmint-section__eyebrow">Game library</p>
            <h2>More than a spin wheel — real skill, real stakes.</h2>
            <p className="playmint-section__lead">
              Luck-first wallet apps optimize probability. PlayMint optimizes effort — better for
              regulars and for owners who need predictable reward cost.
            </p>
            <div className="playmint-games">
              <article className="playmint-game">
                <div className="playmint-game__thumb playmint-game__thumb--solitaire">♠</div>
                <div className="playmint-game__body">
                  <span className="playmint-game__tag">Skill · Solo</span>
                  <h3>Solitaire Challenge</h3>
                  <p>Clear the board under time pressure — classic wait-time filler for cafés.</p>
                </div>
              </article>
              <article className="playmint-game">
                <div className="playmint-game__thumb playmint-game__thumb--match">💎</div>
                <div className="playmint-game__body">
                  <span className="playmint-game__tag">Skill · Solo</span>
                  <h3>Match-3 Sprint</h3>
                  <p>Hit combo targets in 60 seconds — high energy for juice bars and QSR.</p>
                </div>
              </article>
              <article className="playmint-game">
                <div className="playmint-game__thumb playmint-game__thumb--block">▦</div>
                <div className="playmint-game__body">
                  <span className="playmint-game__tag">Skill · Solo</span>
                  <h3>Block Blast</h3>
                  <p>Line clears and score targets — arcade feel for family-friendly venues.</p>
                </div>
              </article>
              <article className="playmint-game">
                <div className="playmint-game__thumb playmint-game__thumb--yatz">🏆</div>
                <div className="playmint-game__body">
                  <span className="playmint-game__tag">Competitive</span>
                  <h3>Weekly leaderboard</h3>
                  <p>Ranked runs with prize tiers — wake up silent loyalty members.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="compare" className="playmint-section">
          <p className="playmint-section__eyebrow">Compare</p>
          <h2>Where PlayMint fits in the stack.</h2>
          <p className="playmint-section__lead">
            Not another loyalty ledger — an engagement layer with Wallet delivery that complements
            what you already run.
          </p>
          <div className="playmint-compare">
            <table>
              <thead>
                <tr>
                  <th scope="col"> </th>
                  <th scope="col">Square Loyalty</th>
                  <th scope="col">Luck-first wallet apps</th>
                  <th scope="col">PlayMint + PassKit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Core job</td>
                  <td className="is-muted">Points &amp; tiers</td>
                  <td className="is-muted">Wallet spin / scratch games</td>
                  <td className="is-highlight">Skill campaigns + Wallet passes</td>
                </tr>
                <tr>
                  <td>Customer app</td>
                  <td className="is-muted">Often tied to Square</td>
                  <td className="is-muted">Usually none</td>
                  <td className="is-highlight">None — browser + Wallet</td>
                </tr>
                <tr>
                  <td>Reward control</td>
                  <td className="is-muted">Points economics</td>
                  <td className="is-muted">Probability tuning</td>
                  <td className="is-highlight">Skill gates + daily caps</td>
                </tr>
                <tr>
                  <td>Positioning</td>
                  <td className="is-muted">Primary loyalty</td>
                  <td className="is-muted">Replace loyalty</td>
                  <td className="is-highlight">Enhance existing loyalty</td>
                </tr>
                <tr>
                  <td>Merchant setup</td>
                  <td className="is-muted">Square add-on</td>
                  <td className="is-muted">Separate SaaS</td>
                  <td className="is-highlight">Self-serve hub · no Google signup per store</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="pricing" className="playmint-section playmint-section--alt">
          <div className="playmint-section__inner">
            <p className="playmint-section__eyebrow">Pricing</p>
            <h2>One engine. Wallet included in the story.</h2>
            <p className="playmint-section__lead">
              Early-access pricing for independents running their first skill + Wallet campaigns.
            </p>
            <div className="playmint-pricing">
              <div className="playmint-pricing__price">
                $79<span>/month</span>
              </div>
              <p style={{ margin: "0.5rem 0 0", color: "var(--pm-muted)", fontSize: "0.9rem" }}>
                Billed monthly · cancel anytime · PassKit pass volume per plan
              </p>
              <ul>
                <li>Unlimited campaigns &amp; coupon types</li>
                <li>All skill game templates + leaderboards</li>
                <li>Branded H5 + QR posters + Wallet pass links</li>
                <li>Staff redeem + play → Wallet → redeem funnel</li>
                <li>Square POS auto-discount — pilot roadmap</li>
              </ul>
              <div className="playmint-pricing__cta">
                <a className="playmint-btn playmint-btn--mint" href={MERCHANT_URL} style={{ width: "100%" }}>
                  Start free pilot
                </a>
              </div>
            </div>

            <div className="playmint-roadmap">
              <div className="playmint-roadmap__col playmint-roadmap__col--live">
                <span className="playmint-roadmap__tag">Live now</span>
                <h3>What merchants get today</h3>
                <ul>
                  <li>Skill campaigns &amp; coupon rules</li>
                  <li>Branded H5 + staff QR / web redeem</li>
                  <li>Merchant dashboard &amp; issue tracking</li>
                  <li>Wallet pass issue via PassKit (platform-managed)</li>
                </ul>
              </div>
              <div className="playmint-roadmap__col">
                <span className="playmint-roadmap__tag">Roadmap</span>
                <h3>What pilots unlock next</h3>
                <ul>
                  <li>Square OAuth discount at register</li>
                  <li>Pass update after redeem (void on pass)</li>
                  <li>Clover + geo push templates</li>
                  <li>Two-week play → redeem ROI report</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="playmint-section">
          <p className="playmint-section__eyebrow">FAQ</p>
          <h2>Honest answers.</h2>
          <div className="playmint-faq">
            <details open>
              <summary>How is PlayMint different from sticki or Square Loyalty?</summary>
              <p>
                Square Loyalty is points and tiers inside Square. sticki is wallet-native luck games.
                PlayMint is skill campaigns plus PassKit Wallet delivery — multi-game challenges,
                score gates, and merchant self-serve — designed to enhance whatever loyalty you
                already run.
              </p>
            </details>
            <details>
              <summary>Do customers need to download an app?</summary>
              <p>
                No. Campaigns run in the mobile browser. After they win, guests tap Add to Apple or
                Google Wallet — no app store install.
              </p>
            </details>
            <details>
              <summary>Does each merchant need Apple or Google developer accounts?</summary>
              <p>
                No. PlayMint uses one PassKit platform account for Wallet delivery — merchants
                don&apos;t register with Google. Apple signing is handled at the platform level
                (Apple Developer + certificate uploaded to PassKit); individual shops only provide
                branding and coupon rules.
              </p>
            </details>
            <details>
              <summary>Do I have to replace my existing loyalty program?</summary>
              <p>
                No — that&apos;s the point. Keep Square Rewards or your punch card. PlayMint adds
                timed campaigns and skill-based Wallet coupons on top.
              </p>
            </details>
            <details>
              <summary>Which POS integrations are live?</summary>
              <p>
                Staff QR and Wallet pass barcode redeem work on any POS today. Square OAuth
                auto-discount at the register is on the roadmap — pilot merchants get early access.
              </p>
            </details>
            <details>
              <summary>Who owns customer data?</summary>
              <p>
                You do. Campaign play and coupon data export from your merchant dashboard. PlayMint
                hosts the game engine and redemption authority; PassKit hosts pass delivery — not
                your full CRM.
              </p>
            </details>
          </div>
        </section>

        <section className="playmint-cta-band">
          <h2>Keep your loyalty program. Pilot wait-time campaigns first.</h2>
          <p>
            Two weeks of play → Wallet install → redeem data. Then expand push reminders or Square
            integration — without ripping out your POS loyalty.
          </p>
          <div className="playmint-cta-band__actions">
            <a className="playmint-btn playmint-btn--mint" href={MERCHANT_URL}>
              Start free pilot
            </a>
            <a className="playmint-btn playmint-btn--ghost" href={MERCHANT_URL}>
              Merchant dashboard
            </a>
          </div>
        </section>
      </main>

      <footer className="playmint-footer">
        <div className="playmint-footer__inner">
          <span>© {new Date().getFullYear()} PlayMint · Skill campaigns + Wallet for local shops</span>
          <div className="playmint-footer__links">
            <a href="/campaign/home">Home</a>
            <a href={MERCHANT_URL}>Merchants</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PlayMintMarketingPage;
