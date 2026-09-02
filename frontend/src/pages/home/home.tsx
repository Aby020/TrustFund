import { MotionConfig } from 'motion/react';
import { Hero } from './components/hero/hero';
import { TrustStrip } from './components/trust-strip/trust-strip';
import { HowItWorks } from './components/how-it-works/how-it-works';
import { Transparency } from './components/transparency/transparency';
import { CampaignPreview } from './components/campaign-preview/campaign-preview';
import { ImpactStory } from './components/impact-story/impact-story';
import { FinalCta } from './components/final-cta/final-cta';

/**
 * HomePage — the TrustFund landing page. Composes the seven section
 * components in order; the SiteHeader and SiteFooter are provided by
 * the AppShell layout wrapper. Exactly one h1 lives in the Hero;
 * every subsequent section uses h2 via the enhanced Section component.
 *
 * MotionConfig reducedMotion="user" ensures every motion element on the
 * page respects the user's prefers-reduced-motion setting automatically.
 */
export default function HomePage() {
  return (
    <MotionConfig reducedMotion="user">
      <Hero />
      <TrustStrip />
      <HowItWorks />
      <Transparency />
      <CampaignPreview />
      <ImpactStory />
      <FinalCta />
    </MotionConfig>
  );
}
