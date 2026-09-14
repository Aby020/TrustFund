import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'motion/react';
import { Container, Icon } from '@/components';
import { EASE, staggerContainer, fadeUp } from '@/components/motion/variants';
import './hero.css';

/**
 * Hero — full-bleed opening section. A real-world impact photograph covers
 * the viewport behind a cinematic dark green/black gradient, and the
 * TrustFund headline is layered directly over the darker left half.
 *
 * The photograph is decorative only (aria-hidden, empty alt): the copy is
 * the meaning. Motion is restrained — a soft image scale-in with a subtle
 * drift parallax, and fade/slide for the text. Transform/layout animations
 * are disabled automatically by the global <MotionConfig reducedMotion> so
 * reduced-motion users get a calm opacity-only reveal.
 */
export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);

  // Subtle parallax — the photo drifts down slightly slower than the scroll
  // as the hero leaves the viewport. transform-only, disabled on reduced motion.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);

  return (
    <section className="hero" ref={sectionRef} aria-labelledby="hero-heading">
      {/* Photography + cinematic overlay — decorative, hidden from AT. */}
      <div className="hero__media" aria-hidden="true">
        <motion.div className="hero__media-viewport" style={{ y: parallaxY }}>
          <motion.img
            className="hero__image"
            src="/images/hero-bg.webp"
            alt=""
            loading="eager"
            fetchPriority="high"
            decoding="async"
            initial={{ scale: 1.08, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.4, ease: EASE }}
          />
        </motion.div>
        <div className="hero__overlay" aria-hidden="true" />
      </div>

      <Container className="hero__inner">
        <motion.div
          className="hero__content"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
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
              className="button button--outline button--lg hero__cta-outline"
            >
              How it works
            </Link>
          </motion.div>

          <motion.p variants={fadeUp} className="hero__trust">
            <Icon name="shield" size={16} />
            Verified charities · Transparent progress · Secure payments
          </motion.p>
        </motion.div>
      </Container>
    </section>
  );
}
