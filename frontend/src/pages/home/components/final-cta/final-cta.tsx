import { Link } from 'react-router-dom';
import { Container, Reveal, Icon } from '@/components';
import './final-cta.css';

/**
 * FinalCta — strong closing call-to-action. Centered, restrained, with a
 * subtle emerald accent treatment. Two CTAs matching header patterns (Link +
 * button classes).
 */
export function FinalCta() {
  return (
    <section className="final-cta" aria-labelledby="final-cta-heading">
      <Container>
        <Reveal className="final-cta__inner">
          <h2 id="final-cta-heading" className="final-cta__heading">
            Make giving feel trustworthy again
          </h2>
          <p className="final-cta__lead">
            Explore verified campaigns, follow their progress, and see the
            difference your contribution makes — start with a single campaign.
          </p>
          <div className="final-cta__buttons">
            <Link
              to="/campaigns"
              className="button button--primary button--lg"
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
      </Container>
    </section>
  );
}
