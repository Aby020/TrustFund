import { Link, useLocation, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button, Container } from '@/components';
import { fadeUp, staggerContainer } from '@/components/motion/variants';
import { formatCurrency } from '@/utils/format';
import './donation-success.css';

interface DonationSuccessState {
  donationId: number;
  amount: number;
  campaignTitle: string;
}

/**
 * DonationSuccess — confirmation page shown after successful Razorpay checkout.
 * Shows receipt access and navigation options. If the user navigates here
 * directly without state, shows a generic success message.
 */
export default function DonationSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const state = location.state as DonationSuccessState | null;

  const amount = state?.amount ?? 0;
  const campaignTitle = state?.campaignTitle ?? 'this campaign';
  const donationId = state?.donationId;

  return (
    <div className="donation-success">
      <Container width="sm">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="donation-success__content"
        >
          {/* Success icon */}
          <motion.div variants={fadeUp} className="donation-success__icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
              <circle cx="32" cy="32" r="30" stroke="var(--color-emerald-500)" strokeWidth="2" />
              <motion.path
                d="M20 32l8 8 16-16"
                stroke="var(--color-emerald-500)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
              />
            </svg>
          </motion.div>

          <motion.h1 variants={fadeUp} className="donation-success__title">
            Thank you for your generosity!
          </motion.h1>

          <motion.p variants={fadeUp} className="donation-success__message">
            {amount > 0 ? (
              <>
                Your donation of <strong>{formatCurrency(amount)}</strong> to{' '}
                <strong>{campaignTitle}</strong> has been received successfully.
              </>
            ) : (
              <>
                Your donation to <strong>{campaignTitle}</strong> has been received successfully.
              </>
            )}
          </motion.p>

          <motion.p variants={fadeUp} className="donation-success__receipt-note">
            A receipt has been generated and will be available in your dashboard.
            You can also download it as a PDF.
          </motion.p>

          <motion.div variants={fadeUp} className="donation-success__actions">
            {donationId && (
              <Link to="/dashboard" className="donation-success__action-link">
                <Button variant="primary" size="lg" fullWidth>
                  View in Dashboard
                </Button>
              </Link>
            )}
            <Link to={`/campaigns/${id}`} className="donation-success__action-link">
              <Button variant="secondary" size="lg" fullWidth>
                Back to Campaign
              </Button>
            </Link>
            <Link to="/campaigns" className="donation-success__action-link">
              <Button variant="ghost" size="lg" fullWidth>
                Discover More Campaigns
              </Button>
            </Link>
          </motion.div>

          {/* Trust reinforcement */}
          <motion.div variants={fadeUp} className="donation-success__trust">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p>
              Your donation is protected by our verification system.
              Receipts are auto-generated and tax-deductible under applicable Indian law.
            </p>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}
