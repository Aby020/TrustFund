import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Container, Badge, Icon } from '@/components';
import {
  staggerContainer,
  fadeUp,
  scaleIn,
  progressFill,
  float,
  ambientLoop,
} from '@/components/motion/variants';
import './hero.css';

/**
 * Hero — the opening section of the landing page. Two-column asymmetric
 * layout on desktop (copy left, product-proof composition right), stacking
 * on mobile. Entrance animation is orchestrated via Framer Motion stagger.
 * The hero contains the only `<h1>` on the page; all subsequent sections
 * use `<h2>`.
 */
export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      {/* Ambient background layer — slow emerald pulse (decorative).
          Fades in from initial opacity 0 via the loop's first keyframe,
          then breathes continuously. transform/opacity only. */}
      <motion.div
        className="hero__ambient"
        initial={{ opacity: 0 }}
        animate={ambientLoop({ opacityRange: [0.6, 0.85], duration: 16 })}
        aria-hidden="true"
      />

      <Container className="hero__inner">
        {/* ---- Copy side (staggered entrance) ---- */}
        <motion.div
          className="hero__copy"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.p variants={fadeUp} className="overline hero__overline">
            Trusted giving, real impact
          </motion.p>

          <motion.h1
            id="hero-heading"
            variants={fadeUp}
            className="hero__heading"
          >
            Every gift, verified.
            <br />
            Every rupee, accounted for.
          </motion.h1>

          <motion.p variants={fadeUp} className="hero__lead">
            TrustFund connects donors to verified charities with end-to-end
            transparency, so your generosity reaches the people it's meant to
            help — and you can see exactly how.
          </motion.p>

          <motion.div variants={fadeUp} className="hero__cta">
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
          </motion.div>

          <motion.p variants={fadeUp} className="hero__trust">
            <Icon name="shield" size={16} />
            Verified charities · Transparent progress · Secure payments
          </motion.p>
        </motion.div>

        {/* ---- Visual composition (product proof) ---- */}
        <motion.div
          className="hero__visual-wrap"
          variants={scaleIn}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ delay: 0.15 }}
        >
          <div className="hero__visual">
            {/* Main campaign card — gentle continuous float */}
            <motion.div
              className="hero__card hero__card--main"
              animate={float({ amplitude: 5, duration: 7, delay: 0.6 })}
            >
              {/* Photo header — above-fold, eager load */}
              <div className="hero__card-media">
                <img
                  src="/images/hero-water.webp"
                  alt="Hands capturing fresh, clean water flowing from a hand pump"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  width={340}
                  height={191}
                />
              </div>
              <div className="hero__card-head">
                <Badge tone="success">
                  <span className="hero__verified-dot" aria-hidden="true" />
                  Verified
                </Badge>
                <span className="hero__card-tag">Water &amp; Sanitation</span>
              </div>
              <h3 className="hero__card-title">Clean water drive</h3>
              <div className="hero__progress-wrap">
                <motion.div
                  className="hero__progress-bar"
                  variants={progressFill}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  transition={{ delay: 0.4, duration: 0.9 }}
                  style={{ width: '64%', transformOrigin: 'left' }}
                />
              </div>
              <div className="hero__card-meta">
                <span>₹3,20,000 of ₹5,00,000</span>
                <span>24 days left</span>
              </div>
            </motion.div>

            {/* Floating receipt chip — independent float */}
            <motion.div
              className="hero__chip hero__chip--receipt"
              animate={float({ amplitude: 7, duration: 5.5, delay: 1.1 })}
            >
              <Icon name="receipt" size={18} />
              <span>Donation receipt · ₹1,000</span>
            </motion.div>

            {/* Floating impact update chip — independent float */}
            <motion.div
              className="hero__chip hero__chip--impact"
              animate={float({ amplitude: 8, duration: 6.5, delay: 0.4 })}
            >
              <span className="hero__pulse" aria-hidden="true" />
              <span>214 people reached</span>
            </motion.div>
          </div>
          <p className="hero__visual-note">Example — illustrative preview</p>
        </motion.div>
      </Container>
    </section>
  );
}
