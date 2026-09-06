import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Button,
  Card,
  Container,
  EmptyState,
  ErrorState,
  Section,
  Skeleton,
} from '@/components';
import { fadeUp, staggerContainer } from '@/components/motion/variants';
import { listVerifiedCharities, type CharitySummary } from '@/services/charities-directory';
import { CharityCard } from './charity-card';
import type { ApiError } from '@/types/api';
import './charities.css';

/** Skeleton grid shown while the directory is loading. */
function CharitiesGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="charities__grid" aria-label="Loading charities" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="charity-card charity-card--skeleton" aria-hidden="true">
          <div className="charity-card__head">
            <Skeleton variant="block" className="charity-card__avatar-skeleton" />
            <div className="charity-card__titles">
              <Skeleton variant="text" width="70%" height={18} />
              <Skeleton variant="text" width="45%" height={12} />
            </div>
          </div>
          <Skeleton variant="block" width="100%" height={10} />
          <Skeleton variant="block" width="100%" height={10} />
        </Card>
      ))}
    </div>
  );
}

/**
 * CharitiesPage — public directory of verified charity organizations.
 *
 * Derived from the existing public campaigns API (see services/charities-directory):
 * every shown charity has at least one live campaign to link into, and only
 * already-public information (name, location, campaign titles) is displayed —
 * never owner/contact details.
 */
export default function CharitiesPage() {
  const [charities, setCharities] = useState<CharitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchCharities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listVerifiedCharities();
      setCharities(data);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCharities();
  }, [fetchCharities]);

  return (
    <div className="charities">
      <Section
        headingLevel="h1"
        overline="Charities"
        heading="Verified organizations you can trust"
        description="Every charity listed here has passed TrustFund's document verification and has live campaigns you can support."
        align="center"
        className="charities__hero"
      />

      <Container>
        {loading && <CharitiesGridSkeleton />}

        {!loading && error && (
          <ErrorState
            title="Failed to load charities"
            description={error.message}
            actions={
              <Button variant="primary" onClick={() => void fetchCharities()}>
                Try again
              </Button>
            }
          />
        )}

        {!loading && !error && charities.length === 0 && (
          <EmptyState
            title="No charities listed yet"
            description="Verified charities will appear here as their campaigns go live."
            action={
              <Link className="button button--secondary button--md" to="/campaigns">
                Browse campaigns
              </Link>
            }
          />
        )}

        {!loading && !error && charities.length > 0 && (
          <motion.div
            className="charities__grid"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {charities.map((charity) => (
              <motion.div key={charity.id} variants={fadeUp}>
                <CharityCard charity={charity} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {!loading && !error && charities.length > 1 && (
          <p className="charities__count" aria-live="polite">
            {charities.length} verified {charities.length === 1 ? 'charity' : 'charities'}
          </p>
        )}
      </Container>
    </div>
  );
}