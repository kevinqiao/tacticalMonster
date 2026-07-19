import React, { useEffect, useState } from "react";

import { PageProp } from "host/RenderApp";

import "./playmint.css";

const MERCHANT_URL = "/partner/operation";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const PlayMintMarketingPage: React.FC<PageProp> = ({ visible }) => {
  const [headerScrolled, setHeaderScrolled] = useState(false);

  useEffect(() => {
    if (visible === 0) return;
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
            <a href="#homepage">Activity hub</a>
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
            <span className="playmint-eyebrow">One link · Posters + optional play-to-win</span>
            <h1>Give guests a homepage they can revisit — reminders that bring coupons back.</h1>
            <p className="playmint-hero__lead">
              Share one branded link on menus, receipts, and social. Update in-store posters and
              promos anytime — no app download. When you run a skill challenge, coupons land in
              Apple Wallet with expiry reminders so more get redeemed, not forgotten in camera
              roll (Google Wallet on the roadmap). Keep Square Loyalty for points — PlayMint
              handles your activity channel.
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
              ~10 min to first poster · Staff QR redeem today · Wallet passes in pilot
            </p>
          </div>

          <div className="playmint-hero__visual" aria-hidden="true">
            <div className="playmint-phone playmint-phone--left">
              <div className="playmint-phone__bar" />
              <div className="playmint-phone__game">Your store homepage</div>
              <div className="playmint-phone__coupon">New menu · Tue slow-day · Weekend challenge</div>
            </div>
            <div className="playmint-phone playmint-phone--right">
              <div className="playmint-phone__bar" />
              <div className="playmint-phone__wallet">
                <span className="playmint-phone__wallet-badge">Wallet</span>
                <span>Free drink · expires Friday</span>
                <span style={{ opacity: 0.75, fontWeight: 600 }}>Reminder before it expires</span>
              </div>
            </div>
          </div>
        </section>

        <div className="playmint-strip">
          <div className="playmint-strip__inner">
            <p className="playmint-strip__label">Built to work with</p>
            <div className="playmint-partners">
              <span className="playmint-partner is-live">
                <span className="playmint-partner__badge">Live</span> Merchant homepage + poster carousel
              </span>
              <span className="playmint-partner is-live">
                <span className="playmint-partner__badge">Live</span> Display posters + skill campaigns · QR redeem
              </span>
              <span className="playmint-partner is-soon">
                <span className="playmint-partner__badge">Live</span> Apple Wallet passes (Google soon)
              </span>
              <span className="playmint-partner is-soon">
                <span className="playmint-partner__badge">Soon</span> Square POS auto-discount
              </span>
            </div>
          </div>
        </div>

        <section className="playmint-stats" aria-label="Highlights">
          <div className="playmint-stat">
            <div className="playmint-stat__num">1 link</div>
            <div className="playmint-stat__label">One homepage guests bookmark — always your latest promos</div>
          </div>
          <div className="playmint-stat">
            <div className="playmint-stat__num">Wallet</div>
            <div className="playmint-stat__label">Expiry reminders — turn issued coupons into visits</div>
          </div>
          <div className="playmint-stat">
            <div className="playmint-stat__num">2 modes</div>
            <div className="playmint-stat__label">Poster promos daily · skill challenges when you want a burst</div>
          </div>
          <div className="playmint-stat">
            <div className="playmint-stat__num">No POS</div>
            <div className="playmint-stat__label">Staff scan redeem tonight — enhance loyalty, don&apos;t replace it</div>
          </div>
        </section>

        <section id="why" className="playmint-section playmint-section--alt">
          <div className="playmint-section__inner">
            <p className="playmint-section__eyebrow">Why PlayMint</p>
            <h2>Bring guests back — then make sure coupons actually get used.</h2>
            <p className="playmint-section__lead">
              Most coupons die in screenshots. PlayMint gives you a living storefront link plus
              Wallet delivery on the roadmap — so marketing isn&apos;t a one-time QR, it&apos;s a
              channel you update and measure.
            </p>
            <div className="playmint-features">
              <article className="playmint-feature">
                <h3>Merchant homepage hub</h3>
                <p>
                  One URL per store — carousel of live campaigns. Put it on table tents, receipts,
                  and Instagram bio. Guests return for what&apos;s new without a new QR every week.
                </p>
              </article>
              <article className="playmint-feature">
                <h3>Poster promos (no game required)</h3>
                <p>
                  Seasonal menus, slow-day specials, events — full-screen posters with phone, maps,
                  or link CTAs. Run your day-to-day marketing without forcing a game every time.
                </p>
              </article>
              <article className="playmint-feature">
                <h3>Wallet reminders (pilot)</h3>
                <p>
                  Coupons install to Apple Wallet — lock-screen visibility and expiry nudges so
                  guests show up before the offer dies in their camera roll. Google Wallet next.
                </p>
              </article>
              <article className="playmint-feature">
                <h3>Enhance, don&apos;t replace</h3>
                <p>
                  Square Rewards or punch cards stay. PlayMint adds timed bursts — slow dayparts,
                  weekend challenges, and win-back links for lapsed regulars.
                </p>
              </article>
              <article className="playmint-feature">
                <h3>Budgetable game bursts</h3>
                <p>
                  When you do run play-to-win: score gates, daily limits, and per-guest caps — so
                  each campaign has a number you can plan around, not a spin wheel you can&apos;t
                  predict.
                </p>
              </article>
              <article className="playmint-feature">
                <h3>Staff redeem in seconds</h3>
                <p>
                  Front counter scans QR or enters a code — no POS integration required to pilot.
                  Square auto-discount is on the roadmap for stores that want register sync.
                </p>
              </article>
            </div>

            <div className="playmint-usecases" style={{ marginTop: "2.5rem" }}>
              <article className="playmint-usecase">
                <span className="playmint-usecase__icon" aria-hidden="true">
                  📅
                </span>
                <div>
                  <h3>Slow-day fill</h3>
                  <p>Poster on your homepage for Tue afternoons — call or maps CTA, no discount bleed across the whole week.</p>
                </div>
              </article>
              <article className="playmint-usecase">
                <span className="playmint-usecase__icon" aria-hidden="true">
                  🏆
                </span>
                <div>
                  <h3>Weekend challenge burst</h3>
                  <p>Turn on a skill campaign when you want energy — leaderboard tiers for regulars who already know your brand.</p>
                </div>
              </article>
              <article className="playmint-usecase">
                <span className="playmint-usecase__icon" aria-hidden="true">
                  🔔
                </span>
                <div>
                  <h3>Lapsed regular wake-up</h3>
                  <p>Send your homepage or a challenge link — Wallet reminder before expiry pulls them back in-store.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="homepage" className="playmint-section">
          <p className="playmint-section__eyebrow">Activity hub</p>
          <h2>Two campaign types — posters for every day, games when you want a spike.</h2>
          <p className="playmint-section__lead">
            Most weeks you only need posters. Skill challenges are optional — switch them on for
            launches, weekends, or win-back, then turn them off without rebuilding your link.
          </p>
          <div className="playmint-features">
            <article className="playmint-feature">
              <h3>Display · poster promos</h3>
              <p>
                Full-screen branded posters on your store homepage. Phone, maps, or external link
                buttons. Perfect for new dishes, holidays, and slow-hour pushes — upload and go live
                in minutes.
              </p>
            </article>
            <article className="playmint-feature">
              <h3>Game · play-to-win coupons</h3>
              <p>
                Solitaire, match-3, block blast, or leaderboard runs. Guests earn a coupon when they
                hit your threshold — capped per day and per guest so the campaign stays budgetable.
              </p>
            </article>
          </div>
        </section>

        <section id="how" className="playmint-section playmint-section--alt">
          <div className="playmint-section__inner">
            <p className="playmint-section__eyebrow">How it works</p>
            <h2>From one link to a redeemed visit.</h2>
            <p className="playmint-section__lead">
              PlayMint sits above your POS and loyalty stack. Your coupon code stays the source of
              truth — Wallet is delivery and reminder, not a second ledger.
            </p>
            <div className="playmint-steps">
              <article className="playmint-step">
                <span className="playmint-step__num">1</span>
                <div>
                  <h3>Share your store homepage</h3>
                  <p>One link — menu sticker, receipt footer, social bio. Guests see every live promo in a carousel.</p>
                </div>
              </article>
              <article className="playmint-step">
                <span className="playmint-step__num">2</span>
                <div>
                  <h3>Browse posters — or play to win</h3>
                  <p>Display campaigns for everyday promos. Optional skill challenges when you want engagement plus a coupon.</p>
                </div>
              </article>
              <article className="playmint-step">
                <span className="playmint-step__num">3</span>
                <div>
                  <h3>Coupon issued with caps</h3>
                  <p>Unique code per win — daily and per-guest limits you set. Campaign cost you can plan, not guess.</p>
                </div>
              </article>
              <article className="playmint-step">
                <span className="playmint-step__num">4</span>
                <div>
                  <h3>Add to Wallet · get reminded</h3>
                  <p>Apple Wallet pass on lock screen with expiry nudges — higher redemption than screenshots. Google Wallet next.</p>
                </div>
              </article>
              <article className="playmint-step">
                <span className="playmint-step__num">5</span>
                <div>
                  <h3>Staff scan · done</h3>
                  <p>Web redeem or pass barcode at the counter today. Square register sync on the roadmap.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="games" className="playmint-section">
          <p className="playmint-section__eyebrow">Optional game library</p>
          <h2>Turn on skill challenges when you want a spike — not every day.</h2>
          <p className="playmint-section__lead">
            Posters handle routine promos. These templates are for bursts — weekend energy, new
            menu launches, or waking up silent loyalty members.
          </p>
          <div className="playmint-games">
            <article className="playmint-game">
              <div className="playmint-game__thumb playmint-game__thumb--solitaire">♠</div>
              <div className="playmint-game__body">
                <span className="playmint-game__tag">Skill · Solo</span>
                <h3>Solitaire Challenge</h3>
                <p>Clear the board under time pressure — calm engagement for cafés and bakeries.</p>
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
                <h3>Leaderboard campaigns</h3>
                <p>Ranked runs with prize tiers — weekend bursts that bring regulars back.</p>
              </div>
            </article>
          </div>
        </section>

        <section id="compare" className="playmint-section playmint-section--alt">
          <div className="playmint-section__inner">
            <p className="playmint-section__eyebrow">Compare</p>
            <h2>Where PlayMint fits in the stack.</h2>
            <p className="playmint-section__lead">
              Not another loyalty ledger — a revisit-friendly activity hub that complements what
              you already run.
            </p>
            <div className="playmint-compare">
              <table>
                <thead>
                  <tr>
                    <th scope="col"> </th>
                    <th scope="col">Square Loyalty</th>
                    <th scope="col">Luck-first wallet apps</th>
                    <th scope="col">PlayMint</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Core job</td>
                    <td className="is-muted">Points &amp; tiers</td>
                    <td className="is-muted">Wallet spin / scratch games</td>
                    <td className="is-highlight">Store homepage + promos + optional play-to-win</td>
                  </tr>
                  <tr>
                    <td>Customer app</td>
                    <td className="is-muted">Often tied to Square</td>
                    <td className="is-muted">Usually none</td>
                    <td className="is-highlight">None — browser + Wallet (pilot)</td>
                  </tr>
                  <tr>
                    <td>Redemption</td>
                    <td className="is-muted">Points at register</td>
                    <td className="is-muted">Probability-tuned prizes</td>
                    <td className="is-highlight">Staff QR today · Wallet reminder · budgetable caps</td>
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
                    <td className="is-highlight">Self-serve · poster first · no POS to pilot</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="pricing" className="playmint-section">
          <p className="playmint-section__eyebrow">Pricing</p>
          <h2>Start with posters. Add games and Wallet when you&apos;re ready.</h2>
          <p className="playmint-section__lead">
            Early-access pricing for independents running their first activity hub + coupon campaigns.
          </p>
          <div className="playmint-pricing">
            <div className="playmint-pricing__price">
              $79<span>/month</span>
            </div>
            <p style={{ margin: "0.5rem 0 0", color: "var(--pm-muted)", fontSize: "0.9rem" }}>
              Billed monthly · cancel anytime · Wallet pass volume per plan
            </p>
            <ul>
              <li>Merchant homepage + unlimited poster &amp; game campaigns</li>
              <li>Display promos with phone / maps / link CTAs</li>
              <li>Skill game templates + leaderboard bursts</li>
              <li>Branded H5 + staff QR redeem</li>
              <li>Wallet passes + expiry reminders — pilot access</li>
              <li>Square POS auto-discount — roadmap</li>
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
                <li>Store homepage carousel at /campaign/your-slug</li>
                <li>Display poster campaigns + skill challenges</li>
                <li>Branded H5 + staff QR / web redeem</li>
                <li>Merchant dashboard + issued coupon tracking</li>
              </ul>
            </div>
            <div className="playmint-roadmap__col">
              <span className="playmint-roadmap__tag">Pilot &amp; roadmap</span>
              <h3>What pilots unlock next</h3>
              <ul>
                <li>Apple Wallet (PassKit) live; Google Wallet on the roadmap</li>
                <li>Expiry push reminders → higher redemption</li>
                <li>Square OAuth discount at register</li>
                <li>Issue → redeem funnel report</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="faq" className="playmint-section playmint-section--alt">
          <div className="playmint-section__inner">
            <p className="playmint-section__eyebrow">FAQ</p>
            <h2>Honest answers.</h2>
            <div className="playmint-faq">
              <details open>
                <summary>Do I need to run a game for every promo?</summary>
                <p>
                  No. Display poster campaigns are built for everyday in-store promos — new menus,
                  slow days, events — with optional phone or maps buttons. Skill challenges are for
                  when you want play-to-win coupons on top.
                </p>
              </details>
              <details>
                <summary>What is the merchant homepage link?</summary>
                <p>
                  Every store gets one URL: /campaign/your-slug. All live campaigns appear in a
                  carousel — share this single link everywhere instead of reprinting QR codes each
                  week.
                </p>
              </details>
              <details>
                <summary>How is PlayMint different from sticki or Square Loyalty?</summary>
                <p>
                  Square Loyalty is points and tiers inside Square. sticki is wallet-native luck games.
                  PlayMint is a revisit-friendly activity hub — posters plus optional skill campaigns
                  — designed to enhance whatever loyalty you already run.
                </p>
              </details>
              <details>
                <summary>Do customers need to download an app?</summary>
                <p>
                  No. Campaigns run in the mobile browser. Wallet install (pilot) is one tap after
                  they win — no app store download.
                </p>
              </details>
              <details>
                <summary>Is Wallet live for every merchant?</summary>
                <p>
                  Staff QR redeem is live today. Apple Wallet pass delivery and expiry reminders
                  are in pilot (Google Wallet on the roadmap) — join from the merchant dashboard.
                  Merchants don&apos;t need their own Apple developer account.
                </p>
              </details>
              <details>
                <summary>Do I have to replace my existing loyalty program?</summary>
                <p>
                  No. Keep Square Rewards or your punch card. PlayMint adds a homepage channel and
                  timed campaigns on top.
                </p>
              </details>
              <details>
                <summary>Which POS integrations are live?</summary>
                <p>
                  Staff QR and web redeem work on any POS today. Square OAuth auto-discount at the
                  register is on the roadmap — pilot merchants get early access.
                </p>
              </details>
            </div>
          </div>
        </section>

        <section className="playmint-cta-band">
          <h2>One homepage link. Posters this week. Wallet reminders when you&apos;re ready.</h2>
          <p>
            Pilot with display posters and staff redeem — add skill bursts and Wallet passes when
            you see issue → redeem data. No POS change required to start.
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
          <span>© {new Date().getFullYear()} PlayMint · Activity hub + Wallet reminders for local shops</span>
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
