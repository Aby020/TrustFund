import { Link } from 'react-router-dom';
import { Brand, Container, Icon } from '@/components';
import { APP_NAME, FOOTER_NAV_GROUPS, FOOTER_TRUST_LINE } from '@/app/config';
import './site-footer.css';

/**
 * SiteFooter — TrustFund's global footer: brand + trust copy, structured
 * navigation groups, and a legal/status bottom bar. Social links are
 * intentionally omitted until real profiles exist (no fabricated URLs).
 */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <Container className="site-footer__top">
        <div className="site-footer__brand">
          <Brand to="/" tagline />
          <p className="site-footer__trust">
            <Icon name="shield" size={16} />
            {FOOTER_TRUST_LINE}
          </p>
        </div>

        <nav className="site-footer__groups" aria-label="Footer">
          {FOOTER_NAV_GROUPS.map((group) => (
            <div className="site-footer__group" key={group.heading}>
              <h2 className="site-footer__heading">{group.heading}</h2>
              <ul className="site-footer__list">
                {group.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="site-footer__link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </Container>

      <Container className="site-footer__bottom">
        <span className="site-footer__copy">
          © {year} {APP_NAME}. All rights reserved.
        </span>
        <span className="site-footer__status">
          <span className="site-footer__status-dot" aria-hidden="true" />
          Built for transparency and impact.
        </span>
      </Container>
    </footer>
  );
}
