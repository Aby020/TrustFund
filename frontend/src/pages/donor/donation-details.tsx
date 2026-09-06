import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Container,
  EmptyState,
  ErrorState,
  Skeleton,
  useToast,
} from '@/components';
import { MotionReveal } from '@/components/motion/motion-reveal';
import { fadeUp, staggerContainer } from '@/components/motion/variants';
import { getDonation } from '@/services/donations';
import { downloadReceipt } from '@/services/receipts';
import { formatCurrency, formatDate } from '@/utils/format';
import type { ApiError, Donation } from '@/types/api';
import { DONATION_STATUS_TONE } from './donation-list-item';
import './donation-details.css';

/**
 * DonationDetails — single donation detail view for the authenticated donor.
 * Ownership is enforced server-side (get_queryset filters to self).
 */
export default function DonationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [donation, setDonation] = useState<Donation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDonation(Number(id));
      setDonation(data);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDownloadReceipt() {
    if (!donation?.receipt_id) return;
    setDownloading(true);
    try {
      await downloadReceipt(donation.receipt_id, donation.receipt_number);
    } catch {
      toast.error(
        'Download failed',
        'We could not download your receipt right now. Please try again.',
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="donation-details">
      <Container>
        <MotionReveal>
          <nav className="donation-details__breadcrumb" aria-label="Breadcrumb">
            <Link to="/donations" className="donation-details__back">
              ← My Donations
            </Link>
          </nav>
        </MotionReveal>

        {loading && <DetailsSkeleton />}

        {!loading && error && (
          <ErrorState
            title="Could not load donation details"
            description={error.message}
            actions={
              <Button variant="primary" onClick={load}>
                Try again
              </Button>
            }
          />
        )}

        {!loading && !error && !donation && (
          <EmptyState
            title="Donation not found"
            description="This donation may have been removed or you may not have permission to view it."
            action={
              <Link to="/donations">
                <Button variant="primary">Back to donations</Button>
              </Link>
            }
          />
        )}

        {!loading && !error && donation && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {/* Header */}
            <MotionReveal className="donation-details__header">
              <h1 className="donation-details__title">Donation Details</h1>
              <Badge tone={DONATION_STATUS_TONE[donation.status]}>
                {donation.status_display}
              </Badge>
            </MotionReveal>

            {/* Main content */}
            <div className="donation-details__layout">
              {/* Primary info */}
              <motion.div variants={fadeUp} className="donation-details__primary">
                <Card>
                  <CardContent className="donation-details__card-body">
                    <div className="donation-details__campaign">
                      {donation.campaign_image ? (
                        <img
                          src={donation.campaign_image}
                          alt={donation.campaign_title}
                          className="donation-details__image"
                        />
                      ) : (
                        <div className="donation-details__image-placeholder" aria-hidden="true">
                          <span className="donation-details__image-icon">♡</span>
                        </div>
                      )}
                      <div className="donation-details__campaign-info">
                        <h2 className="donation-details__campaign-title">
                          {donation.campaign_title}
                        </h2>
                        <Link
                          to={`/campaigns/${donation.campaign}`}
                          className="donation-details__campaign-link"
                        >
                          View campaign →
                        </Link>
                      </div>
                    </div>

                    <div className="donation-details__amount-row">
                      <span className="donation-details__amount-label">Amount</span>
                      <span className="donation-details__amount-value">
                        {formatCurrency(donation.amount)}
                      </span>
                    </div>

                    <div className="donation-details__meta-grid">
                      <MetaItem label="Date" value={formatDate(donation.created_at)} />
                      <MetaItem label="Status" value={donation.status_display} />
                      <MetaItem label="Currency" value={donation.currency} />
                      {donation.is_anonymous && (
                        <MetaItem label="Visibility" value="Anonymous" />
                      )}
                    </div>

                    {donation.message && (
                      <div className="donation-details__message">
                        <span className="donation-details__message-label">Message</span>
                        <p className="donation-details__message-text">{donation.message}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Sidebar */}
              <motion.div variants={fadeUp} className="donation-details__sidebar">
                {/* Payment info */}
                <Card>
                  <CardContent className="donation-details__sidebar-card">
                    <h3 className="donation-details__section-title">Payment information</h3>
                    <div className="donation-details__meta-stack">
                      {donation.razorpay_order_id && (
                        <MetaItem label="Order ID" value={donation.razorpay_order_id} mono />
                      )}
                      {donation.razorpay_payment_id && (
                        <MetaItem label="Payment ID" value={donation.razorpay_payment_id} mono />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Receipt */}
                <Card>
                  <CardContent className="donation-details__sidebar-card">
                    <h3 className="donation-details__section-title">Receipt</h3>
                    {donation.receipt_id ? (
                      <div className="donation-details__receipt">
                        <p className="donation-details__receipt-info">
                          Receipt <strong>{donation.receipt_number}</strong> is available.
                        </p>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleDownloadReceipt}
                          disabled={downloading}
                        >
                          {downloading ? 'Downloading…' : 'Download PDF'}
                        </Button>
                      </div>
                    ) : (
                      <p className="donation-details__no-receipt">
                        {donation.status === 'SUCCESS'
                          ? 'Receipt will be generated shortly.'
                          : 'Receipt is available after successful payment.'}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                  <CardContent className="donation-details__sidebar-card">
                    <h3 className="donation-details__section-title">Actions</h3>
                    <div className="donation-details__actions">
                      <Link to="/donations" className="donation-details__action-link">
                        <Button variant="secondary" size="sm" fullWidth>
                          Back to donations
                        </Button>
                      </Link>
                      <Link
                        to={`/campaigns/${donation.campaign}`}
                        className="donation-details__action-link"
                      >
                        <Button variant="primary" size="sm" fullWidth>
                          View campaign
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        )}
      </Container>
    </div>
  );
}

function MetaItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="donation-details__meta-item">
      <span className="donation-details__meta-label">{label}</span>
      <span className={`donation-details__meta-value${mono ? ' donation-details__meta-value--mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="donation-details__skeleton">
      <Skeleton variant="block" height={32} style={{ marginBottom: 16 }} />
      <div className="donation-details__layout">
        <Skeleton variant="block" height={300} />
        <div className="donation-details__sidebar">
          <Skeleton variant="block" height={120} />
          <Skeleton variant="block" height={120} />
        </div>
      </div>
    </div>
  );
}
