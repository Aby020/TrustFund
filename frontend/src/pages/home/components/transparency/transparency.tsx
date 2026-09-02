import { Container, Section, Reveal, Badge, Icon } from '@/components';
import './transparency.css';

/**
 * TransparencySection — editorial left: transparency philosophy + what donors
 * can see. Right: a product-panel showing live progress, a funding breakdown,
 * an impact update, and a receipt snippet — all clearly labelled as
 * illustrative demo data. Uses the existing Progress bar with values and label
 * attributes for accessibility.
 */

const SEE_ITEMS = [
  {
    icon: 'eye' as const,
    title: 'Live campaign progress',
    desc: 'Goals and raised amounts are public, updated in real time.',
  },
  {
    icon: 'shield' as const,
    title: 'Verification status',
    desc: 'Each charity\'s verification tier is visible up front.',
  },
  {
    icon: 'receipt' as const,
    title: 'Auditable receipts',
    desc: 'Every donation generates a tax-relevant receipt record.',
  },
  {
    icon: 'trending-up' as const,
    title: 'Impact updates',
    desc: 'Organizations report outcomes after disbursal.',
  },
  {
    icon: 'target' as const,
    title: 'A clear funding plan',
    desc: 'Campaigns state how funds are allocated before you give.',
  },
] as const;

const ALLOCATIONS = [
  { label: 'Scholarships', pct: 76, color: 'var(--color-primary, #047857)' },
  { label: 'Operations', pct: 16, color: 'var(--color-border-strong, #b9b4aa)' },
  { label: 'Fundraising', pct: 8, color: 'var(--color-surface-muted, #f4f2ee)' },
] as const;

export function Transparency() {
  return (
    <Section
      headingLevel="h2"
      overline="Transparency by design"
      heading="See exactly where every rupee goes"
      description="TrustFund treats transparency as a product, not a promise. Every campaign shows its goal, its progress, and how funds are meant to be spent — and every donation produces a receipt you can audit."
      className="transparency"
    >
      <Container>
        <div className="transparency__grid">
          {/* ---- Left: what donors can see ---- */}
          <Reveal className="transparency__see">
            <h3 className="transparency__see-title">What you can see</h3>
            <ul className="transparency__see-list">
              {SEE_ITEMS.map((item) => (
                <li key={item.title} className="transparency__see-item">
                  <span className="transparency__see-icon" aria-hidden="true">
                    <Icon name={item.icon} size={18} />
                  </span>
                  <div>
                    <span className="transparency__see-label">{item.title}</span>
                    <span className="transparency__see-desc">{item.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* ---- Right: product panel (illustrative) ---- */}
          <Reveal delay={100} className="transparency__panel-wrap">
            <div className="transparency__panel">
              <div className="transparency__panel-head">
                <h3 className="transparency__panel-title">
                  Saahas Scholarship Fund
                </h3>
                <Badge tone="success">
                  <span className="hero__verified-dot" aria-hidden="true" />
                  Verified
                </Badge>
              </div>

              <div className="transparency__panel-stats">
                <span>Goal: ₹8,00,000</span>
                <span>Raised: ₹6,56,000</span>
              </div>

              {/* Progress bar — accessible with role + aria label */}
              <div className="transparency__progress" role="progressbar" aria-valuenow={82} aria-valuemin={0} aria-valuemax={100} aria-label="Campaign progress: 82 percent">
                <div className="transparency__progress-track">
                  <div className="transparency__progress-fill" style={{ '--progress': '82%' } as React.CSSProperties} />
                </div>
                <span className="transparency__progress-pct">82%</span>
              </div>

              {/* Funding breakdown */}
              <div className="transparency__alloc">
                <h4 className="transparency__alloc-title">Funding breakdown</h4>
                <div className="transparency__alloc-bar" aria-label="Funding allocation — 76% scholarships, 16% operations, 8% fundraising">
                  {ALLOCATIONS.map((a) => (
                    <span
                      key={a.label}
                      className="transparency__alloc-seg"
                      style={{ width: `${a.pct}%`, background: a.color }}
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <div className="transparency__alloc-legend">
                  {ALLOCATIONS.map((a) => (
                    <span key={a.label} className="transparency__alloc-legend-item">
                      <span className="transparency__alloc-dot" style={{ background: a.color }} aria-hidden="true" />
                      {a.label} {a.pct}%
                    </span>
                  ))}
                </div>
              </div>

              {/* Impact update */}
              <div className="transparency__update">
                <span className="transparency__update-dot" aria-hidden="true" />
                <p className="transparency__update-text">
                  <strong>March update</strong> — 128 students received term-fee support.
                </p>
              </div>

              {/* Receipt snippet */}
              <div className="transparency__receipt">
                <Icon name="receipt" size={16} />
                <span>Donation receipt · ₹2,500 · 07 Aug 2026 · TF-284910</span>
              </div>
            </div>
            <p className="transparency__panel-note">Example — illustrative preview</p>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
