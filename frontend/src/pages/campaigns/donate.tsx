import { type FormEvent, useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Checkbox,
  Container,
  ErrorState,
  FormField,
  Input,
  Skeleton,
  Textarea,
} from '@/components';
import { MotionReveal } from '@/components/motion/motion-reveal';
import { getCampaign } from '@/services/campaigns';
import { initiateDonation, verifyPayment } from '@/services/donations';
import { loadRazorpaySdk } from '@/services/razorpay';
import type { RazorpayResponse } from '@/services/razorpay';
import { formatCurrency } from '@/utils/format';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components';
import type { Campaign, ApiError } from '@/types/api';
import './donate.css';

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500, 5000];

/**
 * DonatePage — donation form with amount presets, custom amount, anonymous
 * option, message, and Razorpay checkout integration.
 */
export default function DonatePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Form state
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    amount?: string;
    form?: string;
  }>({});

  const effectiveAmount = (selectedAmount ?? Number(customAmount)) || 0;

  // Fetch campaign
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const camp = await getCampaign(Number(id));
        if (!cancelled) setCampaign(camp);
      } catch (err) {
        if (!cancelled) setError(err as ApiError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  // Warm the Razorpay Checkout SDK in the background so checkout opens fast
  // once the user submits. A failure here is non-fatal — the submit path
  // awaits the same loader and surfaces a helpful message instead.
  useEffect(() => {
    loadRazorpaySdk().catch(() => {
      /* handled on submit */
    });
  }, []);

  function handlePresetClick(amount: number) {
    setSelectedAmount(amount);
    setCustomAmount('');
    setFormErrors((prev) => ({ ...prev, amount: undefined }));
  }

  function handleCustomAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCustomAmount(e.target.value);
    setSelectedAmount(null);
    setFormErrors((prev) => ({ ...prev, amount: undefined }));
  }

  function validate(): boolean {
    const errors: typeof formErrors = {};
    if (effectiveAmount < 1) {
      errors.amount = 'Please enter an amount of at least ₹1';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate() || !campaign || submitting) return;

    setSubmitting(true);
    setFormErrors({});

    try {
      // Generate idempotency key (UUID v4)
      const idempotencyKey = crypto.randomUUID();

      // Initiate donation — creates Razorpay order
      const response = await initiateDonation({
        campaign: campaign.id,
        amount: effectiveAmount,
        currency: 'INR',
        is_anonymous: isAnonymous,
        message: message.trim() || undefined,
        idempotency_key: idempotencyKey,
      });

      // Make sure the official Razorpay Checkout SDK is loaded before we try
      // to construct it. This resolves immediately if the SDK is already in
      // the page (e.g. warmed by the mount effect) and rejects gracefully if
      // it cannot be fetched — never a raw "window.Razorpay is not a
      // constructor".
      try {
        await loadRazorpaySdk();
      } catch {
        setFormErrors({ form: 'The payment gateway is temporarily unavailable. Please try again.' });
        setSubmitting(false);
        return;
      }

      // Open Razorpay checkout
      const razorpay = new window.Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID ?? '',
        amount: effectiveAmount * 100, // Razorpay expects paise
        currency: 'INR',
        name: 'TrustFund',
        description: `Donation to ${campaign.title}`,
        order_id: response.razorpay_order_id,
        handler: async (razorpayResponse: RazorpayResponse) => {
          try {
            // Verify payment with backend
            await verifyPayment(response.id, {
              razorpay_payment_id: razorpayResponse.razorpay_payment_id,
              razorpay_signature: razorpayResponse.razorpay_signature,
            });

            toast.success('Donation successful!', 'Thank you for your generous contribution.');
            navigate(`/campaigns/${campaign.id}/donate/success`, {
              state: {
                donationId: response.id,
                amount: effectiveAmount,
                campaignTitle: campaign.title,
              },
            });
          } catch {
            toast.error(
              'Payment received, verification pending',
              'Your donation was processed. We will confirm it shortly.',
            );
            navigate(`/campaigns/${campaign.id}`);
          }
        },
        prefill: user
          ? { name: `${user.firstName} ${user.lastName}`.trim(), email: user.email }
          : undefined,
        theme: { color: '#059669' },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            toast.info('Donation cancelled', 'You can try again when you are ready.');
          },
        },
      });

      razorpay.open();
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.status === 0) {
        setFormErrors({ form: 'Unable to connect. Please check your internet and try again.' });
      } else if (apiError.status >= 500) {
        setFormErrors({ form: 'Something went wrong. Please try again later.' });
      } else {
        setFormErrors({ form: apiError.message || 'An unexpected error occurred.' });
      }
      setSubmitting(false);
    }
  }

  // --- Loading ---
  if (loading) {
    return (
      <Container>
        <div className="donate-page">
          <Skeleton variant="text" width="50%" height={28} />
          <Skeleton variant="block" height={400} style={{ marginTop: 16 }} />
        </div>
      </Container>
    );
  }

  // --- Error ---
  if (error || !campaign) {
    return (
      <Container>
        <div className="donate-page__error">
          <ErrorState
            title="Campaign not found"
            description="Unable to load the campaign for donation."
            actions={
              <Link to="/campaigns">
                <Button variant="primary">Browse campaigns</Button>
              </Link>
            }
          />
        </div>
      </Container>
    );
  }

  return (
    <div className="donate-page">
      <Container width="md">
        <MotionReveal>
          <div className="donate-page__header">
            <Link to={`/campaigns/${campaign.id}`} className="donate-page__back">
              ← Back to {campaign.title}
            </Link>
            <h1 className="donate-page__title">Make a donation</h1>
            <p className="donate-page__subtitle">
              Supporting <strong>{campaign.title}</strong> by {campaign.organization_name}
            </p>
          </div>
        </MotionReveal>

        <MotionReveal delay={0.1}>
          <form onSubmit={handleSubmit} noValidate aria-label="Make a donation" className="donate-page__form">
            {formErrors.form && (
              <div className="donate-page__form-error" role="alert" aria-live="assertive">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path d="M12 8v5M12 16.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {formErrors.form}
              </div>
            )}

            {/* Amount selection */}
            <fieldset className="donate-page__fieldset">
              <legend className="donate-page__legend">Select amount</legend>

              <div className="donate-page__presets">
                {PRESET_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={`donate-page__preset ${selectedAmount === amount ? 'donate-page__preset--active' : ''}`}
                    onClick={() => handlePresetClick(amount)}
                    aria-pressed={selectedAmount === amount}
                  >
                    {formatCurrency(amount)}
                  </button>
                ))}
              </div>

              <FormField label="Custom amount" htmlFor="custom-amount" error={formErrors.amount}>
                {({ id: fieldId, invalid }) => (
                  <div className="donate-page__custom-amount">
                    <span className="donate-page__currency" aria-hidden="true">₹</span>
                    <Input
                      id={fieldId}
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Enter amount"
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                      invalid={invalid}
                      aria-describedby={formErrors.amount ? `${fieldId}-error` : undefined}
                      className="donate-page__amount-input"
                    />
                  </div>
                )}
              </FormField>
            </fieldset>

            {/* Anonymous toggle */}
            <div className="donate-page__anonymous">
              <Checkbox
                id="donation-anonymous"
                label="Donate anonymously"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              <p className="donate-page__anonymous-hint">
                Your name will not be shown on the campaign page.
              </p>
            </div>

            {/* Message */}
            <FormField label="Leave a message (optional)" htmlFor="donation-message">
              {({ id: fieldId }) => (
                <Textarea
                  id={fieldId}
                  placeholder="Write an encouraging message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1000}
                  rows={3}
                />
              )}
            </FormField>

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
              disabled={effectiveAmount < 1}
            >
              {submitting ? 'Processing...' : `Donate ${effectiveAmount > 0 ? formatCurrency(effectiveAmount) : ''}`}
            </Button>

            <p className="donate-page__secure-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              Payments are processed securely via Razorpay. We never store your card details.
            </p>
          </form>
        </MotionReveal>
      </Container>
    </div>
  );
}
