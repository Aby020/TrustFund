import { Link } from 'react-router-dom';
import { Container, Icon } from '@/components';
import { motion } from 'motion/react';
import { fadeUp, ambientLoop } from '@/components/motion/variants';
import './final-cta.css';

/**
 * FinalCta — strong closing call-to-action. Centered, restrained, with a
 * subtle emerald accent treatment. Two CTAs matching header patterns (Link +
 * button classes). Migrated to Framer Motion: a slow ambient background
 * glow and refined hover/tap feedback on the primary actions.
 */

const MotionLink = motion.create(Link);

export function FinalCta() {
  return (
    <section className="final-cta" aria-labelledby="final-cta-heading">
      {/* Ambient background glow — decorative, aria-hidden, transform/opacity
          only. Fades in from initial opacity 0 via the loop's first keyframe,
          then breathes continuously. */}
      <motion.div
        className="final-cta__ambient"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={ambientLoop({ scaleRange: [1, 1.04], opacityRange: [0.5, 0.8], duration: 16 })}
      />

      <Container>
        <motion.div
          className="final-cta__inner"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <h2 id="final-cta-heading" className="final-cta__heading">
            Make giving feel trustworthy again
          </h2>
          <p className="final-cta__lead">
            Explore verified campaigns, follow their progress, and see the
            difference your contribution makes — start with a single campaign.
          </p>
          <div className="final-cta__buttons">
            <MotionLink
              to="/campaigns"
              className="button button--primary button--lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Explore campaigns
              <Icon name="arrow-right" size={18} />
            </MotionLink>
            <MotionLink
              to="/how-it-works"
              className="button button--outline button--lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              How it works
            </MotionLink>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
