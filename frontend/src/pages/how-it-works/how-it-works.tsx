import { Link } from 'react-router-dom';
import { MotionConfig, motion } from 'motion/react';
import { Container, Icon, Section } from '@/components';
import { fadeUp, staggerContainer } from '@/components/motion/variants';
import { HowItWorks as TrustFlowStepper } from '@/pages/home/components/how-it-works/how-it-works';
import type { IconName } from '@/components/icon/icon';
import './how-it-works.css';

interface AudienceStep {
  title: string;
  copy: string;
}

interface Audience {
  key: string;
  icon: IconName;
  eyebrow: string;
  heading: string;
  intro: string;
  steps: AudienceStep[];
  cta: { label: string; to: string };
}

/**
 * The three journeys TrustFund supports today. Copy describes only flows the
 * platform actually implements — no invented backend functionality:
 *  - donors   : public campaign discovery, Razorpay donations, auto receipts, updates
 *  - charities: organization creation, document verification, live campaigns, updates
 *  - volunteers: opportunity discovery, applications, approval states
 */
const AUDIENCES: Audience[] = [
  {
    key: 'donors',
    icon: 'heart',
    eyebrow: 'For donors',
    heading: 'Give with confidence',
    intro:
      'Every stage of your giving is visible — from choosing a verified cause to watching it reach its goal.',
    steps: [
      {
        title: 'Discover',
        copy: 'Browse verified campaigns sorted by cause, location, and impact, with clear funding progress on every card.',
      },
      {
        title: 'Donate securely',
        copy: 'Contributions are processed through trusted payment rails. Your gift is recorded the moment it succeeds.',
      },
      {
        title: 'Get a receipt',
        copy: 'Every successful donation generates a receipt automatically, so your records stay clean without any paperwork.',
      },
      {
        title: 'Follow the impact',
        copy: 'Campaigns publish real-time progress and updates, so you can see exactly where your contribution goes.',
      },
    ],
    cta: { label: 'Browse campaigns', to: '/campaigns' },
  },
  {
    key: 'charities',
    icon: 'shield',
    eyebrow: 'For verified charities',
    heading: 'Raise funds the trusted way',
    intro:
      'We gate public fundraising behind document verification so donors always know who they are giving to.',
    steps: [
      {
        title: 'Create your organization',
        copy: 'Sign up with a CHARITY account and register your organization with its legal details.',
      },
      {
        title: 'Get verified',
        copy: 'Submit your organization for review. Our administrators verify your documents before anything public goes live.',
      },
      {
        title: 'Publish campaigns',
        copy: "Once verified, your campaigns go live immediately, with a clear goal, location, and timeline.",
      },
      {
        title: 'Share updates',
        copy: 'Post progress updates as donations arrive, keeping every supporter informed along the way.',
      },
    ],
    cta: { label: 'Register your charity', to: '/auth/register' },
  },
  {
    key: 'volunteers',
    icon: 'users',
    eyebrow: 'For volunteers',
    heading: 'Lend your time where it counts',
    intro:
      'Verified charities open volunteer opportunities alongside their campaigns, and every opening is listed and managed here.',
    steps: [
      {
        title: 'Find opportunities',
        copy: 'Browse active volunteer openings from verified charities, including location, date, and available slots.',
      },
      {
        title: 'Apply',
        copy: 'Submit a short application for an opening you care about, straight from the platform.',
      },
      {
        title: 'Get approved',
        copy: 'Charities review applications and approve volunteers, so you always know where your application stands.',
      },
    ],
    cta: { label: 'Join as a volunteer', to: '/auth/register' },
  },
];

/**
 * HowItWorksPage — public explainer for the TrustFund flow.
 *
 * Composes the landing page's four-step trust stepper with per-audience
 * journeys for donors, verified charities, and volunteers. Wrapped in
 * MotionConfig so every section respects the visitor's reduced-motion
 * preference (same pattern the landing page uses).
 */
export default function HowItWorksPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="how-it-works-page">
        <Section
          headingLevel="h1"
          overline="How it works"
          heading="Transparent giving, end to end"
          description="One accountable platform for trusted giving — from verified charities to tracked impact."
          align="center"
          className="how-it-works-page__hero"
        />

        <TrustFlowStepper />

        <div className="how-it-works-page__audiences">
          <Container>
            <div className="how-it-works-page__audience-stack">
              {AUDIENCES.map((audience) => (
                <Section
                  key={audience.key}
                  headingLevel="h2"
                  overline={audience.eyebrow}
                  heading={audience.heading}
                  description={audience.intro}
                  className="how-it-works-page__audience"
                >
                  <motion.div
                    className="how-it-works-page__steps"
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.15 }}
                  >
                    {audience.steps.map((step) => (
                      <motion.div key={step.title} className="how-it-works-page__step" variants={fadeUp}>
                        <span className="how-it-works-page__step-node" aria-hidden="true">
                          <Icon name={audience.icon} size={16} />
                        </span>
                        <div className="how-it-works-page__step-copy">
                          <h3 className="how-it-works-page__step-title">{step.title}</h3>
                          <p className="how-it-works-page__step-text">{step.copy}</p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>

                  <div className="how-it-works-page__audience-cta">
                    <Link
                      to={audience.cta.to}
                      className="button button--secondary button--md"
                    >
                      {audience.cta.label}
                    </Link>
                  </div>
                </Section>
              ))}
            </div>
          </Container>
        </div>

        {/* Closing CTA */}
        <section className="how-it-works-page__cta" aria-labelledby="how-it-works-cta-heading">
          <Container>
            <div className="how-it-works-page__cta-inner">
              <h2 id="how-it-works-cta-heading" className="how-it-works-page__cta-heading">
                Ready to make giving feel trustworthy again?
              </h2>
              <p className="how-it-works-page__cta-lead">
                Start by exploring verified campaigns, or create your account and begin your journey here.
              </p>
              <div className="how-it-works-page__cta-buttons">
                <Link to="/campaigns" className="button button--primary button--lg">
                  Explore campaigns
                  <Icon name="arrow-right" size={18} />
                </Link>
                <Link to="/auth/register" className="button button--outline button--lg">
                  Create an account
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </div>
    </MotionConfig>
  );
}