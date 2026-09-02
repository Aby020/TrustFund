import { Link } from 'react-router-dom';
import { cx } from '@/utils/cx';
import { APP_NAME } from '@/app/config';
import './brand.css';

export interface BrandProps {
  /** Destination of the wordmark (home by default). */
  to?: string;
  /** Show the tagline subline (footer) vs. a compact wordmark (header). */
  tagline?: boolean;
  className?: string;
}

/**
 * Brand — TrustFund's mark + wordmark. Reused by the header (compact) and the
 * footer (with tagline). The mark is a single inline SVG: an emerald gradient
 * tile with a white heart and a growth spark.
 */
export function Brand({ to = '/', tagline = false, className }: BrandProps) {
  return (
    <Link
      to={to}
      className={cx('brand', tagline && 'brand--tagline', className)}
      aria-label={`${APP_NAME} — home`}
    >
      <span className="brand__mark" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 19.4S5.2 15.2 3.4 11.8C2.1 9.4 3.6 6.4 6.7 6.4c1.9 0 3.3 1 4 2.3.7-1.3 2.1-2.3 4-2.3 3.1 0 4.6 3 3.3 5.4-1.8 3.4-8.6 7.6-8.6 7.6Z"
            fill="#fff"
          />
          <path
            d="M15.2 3.6c.9 2.1.2 3.7-1.5 5 .9.3 1.7 1 2.2 2-.9-2.2-1.3-4.4-.7-7Z"
            fill="var(--emerald-200)"
          />
        </svg>
      </span>
      <span className="brand__wordmark">
        <span className="brand__name">{APP_NAME}</span>
        {tagline && <span className="brand__tagline">Trusted giving, real impact</span>}
      </span>
    </Link>
  );
}
