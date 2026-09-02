import { Container } from '@/components';
import { motion } from 'motion/react';
import { staggerContainer, fadeUp } from '@/components/motion/variants';
import './impact-story.css';

/**
 * ImpactStory — editorial human-centric section. Typography-driven
 * composition with a large pull-quote and supporting prose. No images,
 * no fabricated testimonials from named individuals. The content frames
 * the kind of outcome the platform is designed to enable. Migrated to
 * Framer Motion for a staggered editorial reveal.
 */

const REASONS = [
  {
    strong: 'Recurring trust',
    rest: ' — verified teams attract repeat support, not one-off gifts.',
  },
  {
    strong: 'Seen impact',
    rest: ' — when donors witness outcomes, they stay engaged longer.',
  },
  {
    strong: 'Verified partners',
    rest: ' — trust is the currency that makes scale possible.',
  },
] as const;

export function ImpactStory() {
  return (
    <section className="impact-story" aria-labelledby="impact-story-heading">
      <Container>
        <div className="impact-story__grid">
          {/* ---- Left: pull-quote ---- */}
          <motion.div
            className="impact-story__quote-wrap"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <motion.blockquote
              className="impact-story__quote"
              id="impact-story-heading"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 1.1, ease: 'easeInOut' }}
            >
              <p className="impact-story__quote-text">
                When giving is legible, it becomes durable. People don't stop
                with one donation — they stay with organizations that show what
                happened after the money arrived.
              </p>
            </motion.blockquote>
          </motion.div>

          {/* ---- Right: editorial prose ---- */}
          <motion.div
            className="impact-story__prose"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <motion.h2 className="impact-story__heading" variants={fadeUp}>
              Behind every transfer, a person
            </motion.h2>

            <motion.p className="impact-story__para" variants={fadeUp}>
              For a donor, a verified campaign is the difference between a guess
              and a plan. For a school or community clinic, it's the difference
              between a promise kept and a promise forgotten.
            </motion.p>

            <motion.p className="impact-story__para" variants={fadeUp}>
              TrustFund exists so generosity doesn't have to be blind. When
              organizations show their work — transparently, verifiably, in real
              time — giving stops being an act of faith and becomes an act of
              partnership.
            </motion.p>

            <motion.ul className="impact-story__reasons" variants={fadeUp}>
              {REASONS.map((reason) => (
                <li key={reason.strong} className="impact-story__reason">
                  <span className="impact-story__reason-mark" aria-hidden="true" />
                  <div>
                    <strong>{reason.strong}</strong>
                    <span>{reason.rest}</span>
                  </div>
                </li>
              ))}
            </motion.ul>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
