import { Container, Reveal } from '@/components';
import './impact-story.css';

/**
 * ImpactStory — editorial human-centric section. Typography-driven
 * composition with a large pull-quote and supporting prose. No images,
 * no fabricated testimonials from named individuals. The content frames
 * the kind of outcome the platform is designed to enable.
 */
export function ImpactStory() {
  return (
    <section className="impact-story" aria-labelledby="impact-story-heading">
      <Container>
        <div className="impact-story__grid">
          {/* ---- Left: pull-quote ---- */}
          <Reveal className="impact-story__quote-wrap">
            <blockquote className="impact-story__quote" id="impact-story-heading">
              <p className="impact-story__quote-text">
                When giving is legible, it becomes durable. People don't stop
                with one donation — they stay with organizations that show what
                happened after the money arrived.
              </p>
            </blockquote>
          </Reveal>

          {/* ---- Right: editorial prose ---- */}
          <Reveal delay={80} className="impact-story__prose">
            <h2 className="impact-story__heading">Behind every transfer, a person</h2>

            <p className="impact-story__para">
              For a donor, a verified campaign is the difference between a guess
              and a plan. For a school or community clinic, it's the difference
              between a promise kept and a promise forgotten.
            </p>

            <p className="impact-story__para">
              TrustFund exists so generosity doesn't have to be blind. When
              organizations show their work — transparently, verifiably, in real
              time — giving stops being an act of faith and becomes an act of
              partnership.
            </p>

            <ul className="impact-story__reasons">
              <li className="impact-story__reason">
                <span className="impact-story__reason-mark" aria-hidden="true" />
                <div>
                  <strong>Recurring trust</strong>
                  <span> — verified teams attract repeat support, not one-off gifts.</span>
                </div>
              </li>
              <li className="impact-story__reason">
                <span className="impact-story__reason-mark" aria-hidden="true" />
                <div>
                  <strong>Seen impact</strong>
                  <span> — when donors witness outcomes, they stay engaged longer.</span>
                </div>
              </li>
              <li className="impact-story__reason">
                <span className="impact-story__reason-mark" aria-hidden="true" />
                <div>
                  <strong>Verified partners</strong>
                  <span> — trust is the currency that makes scale possible.</span>
                </div>
              </li>
            </ul>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
