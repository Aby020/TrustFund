import { Container, Section, Icon } from '@/components';
import { motion } from 'motion/react';
import { staggerContainer, fadeUp, scaleIn } from '@/components/motion/variants';
import './how-it-works.css';

/**
 * HowItWorks — four-step progression: Discover → Verify → Give → Track.
 * Horizontal stepper on desktop with connecting hairline; vertical on mobile.
 * Uses h2 heading level via Section. Migrated to Framer Motion for
 * staggered entrance.
 */

const STEPS = [
  {
    num: 1,
    icon: 'search' as const,
    title: 'Discover',
    copy: 'Browse campaigns from organizations working in causes you care about — water, education, healthcare, and more.',
  },
  {
    num: 2,
    icon: 'shield' as const,
    title: 'Verify',
    copy: 'Every charity is document-verified before any public campaign goes live. You know exactly who you are giving to.',
  },
  {
    num: 3,
    icon: 'heart' as const,
    title: 'Give',
    copy: 'Donate securely. Payments are processed through trusted rails, and every gift is receipted automatically.',
  },
  {
    num: 4,
    icon: 'eye' as const,
    title: 'Track',
    copy: 'Campaigns publish real-time progress and impact updates, so your money\'s journey stays visible from donation to outcome.',
  },
] as const;

export function HowItWorks() {
  return (
    <Section
      headingLevel="h2"
      overline="How it works"
      heading="Giving that earns trust, step by step"
      description="Unlike scattered fundraising pages, TrustFund keeps verification, payments, receipts, and reporting in one accountable place."
      align="center"
      className="how-it-works"
    >
      <Container>
        <motion.ol
          className="how-it-works__steps"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {STEPS.map((step) => (
            <motion.li
              key={step.num}
              className="how-it-works__step"
              variants={fadeUp}
            >
              <div className="how-it-works__node" aria-hidden="true">
                <span className="how-it-works__number">{step.num}</span>
                <motion.span className="how-it-works__icon" variants={scaleIn}>
                  <Icon name={step.icon} size={18} />
                </motion.span>
              </div>
              <h3 className="how-it-works__title">{step.title}</h3>
              <p className="how-it-works__copy">{step.copy}</p>
            </motion.li>
          ))}
        </motion.ol>
      </Container>
    </Section>
  );
}
