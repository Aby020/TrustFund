import { Container, Section, Reveal, Icon } from '@/components';
import './how-it-works.css';

/**
 * HowItWorks — four-step progression: Discover → Verify → Give → Track.
 * Horizontal stepper on desktop with connecting hairline; vertical on mobile.
 * Uses h2 heading level via Section.
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
        <ol className="how-it-works__steps">
          {STEPS.map((step, i) => (
            <li key={step.num} className="how-it-works__step">
              <Reveal delay={i * 80}>
                <div className="how-it-works__node" aria-hidden="true">
                  <span className="how-it-works__number">{step.num}</span>
                  <span className="how-it-works__icon">
                    <Icon name={step.icon} size={18} />
                  </span>
                </div>
                <h3 className="how-it-works__title">{step.title}</h3>
                <p className="how-it-works__copy">{step.copy}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
