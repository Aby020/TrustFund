import { Container, Icon } from '@/components';
import { motion } from 'motion/react';
import { staggerContainer, fadeUp } from '@/components/motion/variants';
import './trust-strip.css';

/**
 * TrustStrip — a horizontal credibility bar showing five product capabilities.
 * Migrated to Framer Motion for staggered entrance.
 */

const TRUST_ITEMS = [
  {
    icon: 'building' as const,
    title: 'Verified charities',
    desc: 'Every organization is document-verified before a campaign goes live.',
  },
  {
    icon: 'eye' as const,
    title: 'Transparent progress',
    desc: 'Campaign goals, raised amounts, and deadlines are publicly visible.',
  },
  {
    icon: 'wallet' as const,
    title: 'Secure payments',
    desc: 'Donations are processed through trusted payment rails (Razorpay).',
  },
  {
    icon: 'receipt' as const,
    title: 'Donation receipts',
    desc: 'Every gift generates an auditable, tax-relevant receipt record.',
  },
  {
    icon: 'trending-up' as const,
    title: 'Measurable impact',
    desc: 'Organizations publish updates so donors see real outcomes.',
  },
] as const;

export function TrustStrip() {
  return (
    <section className="trust-strip" aria-label="Trust and safety capabilities">
      <Container>
        <motion.ul
          className="trust-strip__list"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {TRUST_ITEMS.map((item) => (
            <motion.li key={item.title} className="trust-strip__item" variants={fadeUp}>
              <span className="trust-strip__icon" aria-hidden="true">
                <Icon name={item.icon} size={20} />
              </span>
              <div className="trust-strip__text">
                <h3 className="trust-strip__title">{item.title}</h3>
                <p className="trust-strip__desc">{item.desc}</p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </section>
  );
}
