import { Link } from 'react-router-dom';
import { Container, Reveal, Badge, Icon } from '@/components';
import './hero.css';

/**
 * Hero — the opening section of the landing page. Two-column asymmetric
 * layout on desktop (copy left, product-proof composition right), stacking
 * on mobile. Entrance animation is staggered via Reveal delays. The hero
 * contains the only `<h1>` on the page; all subsequent sections use `<h2>`.
 */
export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <Container className="hero__inner">
        {/* ---- Copy side ---- */}
        <div className="hero__copy">
          <Reveal delay={0}>
            <p className="overline hero__overline">Trusted giving, real impact</p>
          </Reveal>

          <Reveal delay={80}>
            <h1 id="hero-heading" className="hero__heading">
              Every gift, verified.
              <br />
              Every rupee, accounted for.
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="hero__lead">
              TrustFund connects donors to verified charities with end-to-end
              transparency, so your generosity reaches the people it's meant to
              help — and you can see exactly how.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="hero__cta">
              <Link
                to="/campaigns"
                className="button button--primary button--lg hero__cta-primary"
              >
                Explore campaigns
                <Icon name="arrow-right" size={18} />
              </Link>
              <Link
                to="/how-it-works"
                className="button button--outline button--lg"
              >
                How it works
              </Link>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <p className="hero__trust">
              <Icon name="shield" size={16} />
              Verified charities · Transparent progress · Secure payments
            </p>
          </Reveal>
        </div>

        {/* ---- Visual composition (product proof) ---- */}
        <Reveal delay={200} className="hero__visual-wrap">
          <div className="hero__visual">
            {/* Main campaign card */}
            <div className="hero__card hero__card--main">
              <div className="hero__card-head">
                <Badge tone="success">
                  <span className="hero__verified-dot" aria-hidden="true" />
                  Verified
                </Badge>
                <span className="hero__card-tag">Water &amp; Sanitation</span>
              </div>
              <h3 className="hero__card-title">Clean water drive</h3>
              <div className="hero__progress-wrap">
                <div
                  className="hero__progress-bar"
                  style={{ '--hero-progress': '64%' } as React.CSSProperties}
                />
              </div>
              <div className="hero__card-meta">
                <span>₹3,20,000 of ₹5,00,000</span>
                <span>24 days left</span>
              </div>
            </div>

            {/* Floating receipt chip */}
            <div className="hero__chip hero__chip--receipt">
              <Icon name="receipt" size={18} />
              <span>Donation receipt · ₹1,000</span>
            </div>

            {/* Floating impact update chip */}
            <div className="hero__chip hero__chip--impact">
              <span className="hero__pulse" aria-hidden="true" />
              <span>214 people reached</span>
            </div>
          </div>
          <p className="hero__visual-note">Example — illustrative preview</p>
        </Reveal>
      </Container>
    </section>
  );
}
