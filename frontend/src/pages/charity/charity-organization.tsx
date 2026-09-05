import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Container,
  ErrorState,
  FormField,
  Input,
  Skeleton,
  Textarea,
  useToast,
} from '@/components';
import { MotionReveal } from '@/components/motion/motion-reveal';
import {
  createOrganization,
  getMyOrganization,
  getVerificationHistory,
  submitForVerification,
  updateOrganization,
} from '@/services/charity';
import { formatDate } from '@/utils/format';
import { VERIFICATION_STATUS_TONES } from '@/types/api';
import type { ApiError, CharityOrganization } from '@/types/api';
import { CharityNav } from './charity-nav';
import './charity-organization.css';

interface OrgForm {
  name: string;
  description: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  registration_number: string;
}

const EMPTY_FORM: OrgForm = {
  name: '',
  description: '',
  email: '',
  phone: '',
  website: '',
  address: '',
  city: '',
  state: '',
  country: '',
  registration_number: '',
};

/**
 * CharityOrganization — view and manage the charity's organization profile,
 * including the verification workflow (submit, resubmit after rejection).
 */
export default function CharityOrganizationPage() {
  const { success, error: toastError } = useToast();
  const [org, setOrg] = useState<CharityOrganization | null>(null);
  const [form, setForm] = useState<OrgForm>(EMPTY_FORM);
  const [history, setHistory] = useState<
    { id: number; action_display: string; performed_by_name: string; from_status: string; to_status: string; reason: string; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [missingOrg, setMissingOrg] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMissingOrg(false);
    try {
      const data = await getMyOrganization();
      setOrg(data);
      setForm({
        name: data.name ?? '',
        description: data.description ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
        website: data.website ?? '',
        address: data.address ?? '',
        city: data.city ?? '',
        state: data.state ?? '',
        country: data.country ?? '',
        registration_number: data.registration_number ?? '',
      });
      const hist = await getVerificationHistory(data.id);
      setHistory(hist);
    } catch (err) {
      const apiError = err as ApiError;
      // 404 signals no organization yet — surface the create form instead.
      if (apiError.status === 404) {
        setMissingOrg(true);
      } else {
        setError(apiError);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function setField(key: keyof OrgForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      const created = await createOrganization(form);
      setOrg(created);
      setMissingOrg(false);
      setHistory([]);
      success('Organization created', 'You can now submit it for verification.');
    } catch (err) {
      const apiError = err as ApiError;
      // Keep the create form visible — only show field errors and toast, never
      // the top-level ErrorState, so the user can retry without a page reload.
      if (apiError.fieldErrors) {
        setFieldErrors(apiError.fieldErrors);
        // Only claim fields are highlighted when a real field carries the
        // error; DRF form-level errors (non_field_errors) or errors on fields
        // the form doesn't render would otherwise show a misleading toast with
        // nothing highlighted.
        toastError(
          hasFieldErrors(apiError.fieldErrors)
            ? 'Please fix the highlighted fields'
            : apiError.message,
        );
      } else {
        toastError(apiError.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setSaving(true);
    setFieldErrors({});
    try {
      const updated = await updateOrganization(org.id, form);
      setOrg(updated);
      setForm({
        name: updated.name ?? '',
        description: updated.description ?? '',
        email: updated.email ?? '',
        phone: updated.phone ?? '',
        website: updated.website ?? '',
        address: updated.address ?? '',
        city: updated.city ?? '',
        state: updated.state ?? '',
        country: updated.country ?? '',
        registration_number: updated.registration_number ?? '',
      });
      success('Organization updated');
    } catch (err) {
      handleSaveError(err as ApiError);
    } finally {
      setSaving(false);
    }
  }

  function handleSaveError(err: ApiError) {
    if (err.fieldErrors) {
      setFieldErrors(err.fieldErrors);
      toastError(
        hasFieldErrors(err.fieldErrors)
          ? 'Please fix the highlighted fields'
          : err.message,
      );
    } else {
      setError(err);
      toastError(err.message);
    }
  }

  function hasFieldErrors(fieldErrors: Record<string, string[]>): boolean {
    // DRF wraps form-level errors under `non_field_errors`, which is not a
    // rendered input — only report "fix the highlighted fields" when an actual
    // field on the form carries the error.
    return Object.keys(fieldErrors).some((key) => key !== 'non_field_errors');
  }

  async function handleSubmit() {
    if (!org) return;
    setSaving(true);
    try {
      await submitForVerification(org.id);
      const updated = await getMyOrganization();
      setOrg(updated);
      const hist = await getVerificationHistory(updated.id);
      setHistory(hist);
      success('Submitted for verification', 'An administrator will review your organization.');
    } catch (err) {
      toastError((err as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleResubmit() {
    if (!org) return;
    setSaving(true);
    try {
      await submitForVerification(org.id);
      const updated = await getMyOrganization();
      setOrg(updated);
      const hist = await getVerificationHistory(updated.id);
      setHistory(hist);
      success('Resubmitted for verification');
    } catch (err) {
      toastError((err as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="charity-org">
      <Container>
        <MotionReveal>
          <CharityNav />
        </MotionReveal>

        <MotionReveal className="charity-org__header">
          <div>
            <p className="charity-org__overline">Organization</p>
            <h1 className="charity-org__title">Organization profile</h1>
            <p className="charity-org__subtitle">
              Manage your organization details and verification status.
            </p>
          </div>
        </MotionReveal>

        {loading && (
          <div className="charity-org__skeleton">
            <Skeleton variant="block" height={220} />
          </div>
        )}

        {!loading && error && (
          <ErrorState
            title="Could not load your organization"
            description={error.message}
            actions={<Button variant="primary" onClick={load}>Try again</Button>}
          />
        )}

        {!loading && !error && (
          <>
            {org && (
              <MotionReveal className="charity-org__status">
                <div className="charity-org__status-info">
                  <span className="charity-org__status-label">Verification status</span>
                  <Badge tone={VERIFICATION_STATUS_TONES[org.verification_status] as 'info' | 'success' | 'danger'}>
                    {org.verification_status_display}
                  </Badge>
                  {org.verified_at && (
                    <span className="charity-org__status-date">
                      Verified on {formatDate(org.verified_at)}
                    </span>
                  )}
                  {org.rejection_reason && (
                    <p className="charity-org__status-reason">
                      Reason: {org.rejection_reason}
                    </p>
                  )}
                </div>

                {org.verification_status === 'PENDING' && (
                  <Button variant="secondary" disabled={saving} onClick={handleSubmit}>
                    {saving ? 'Submitting…' : 'Submit for verification'}
                  </Button>
                )}
                {org.verification_status === 'REJECTED' && (
                  <Button variant="primary" disabled={saving} onClick={handleResubmit}>
                    {saving ? 'Submitting…' : 'Resubmit for verification'}
                  </Button>
                )}
              </MotionReveal>
            )}

            {missingOrg ? (
              <CreateOrgForm
                form={form}
                fieldErrors={fieldErrors}
                saving={saving}
                setField={setField}
                onSubmit={handleCreate}
              />
            ) : (
              org && (
                <OrgForm
                  form={form}
                  fieldErrors={fieldErrors}
                  saving={saving}
                  setField={setField}
                  onSubmit={handleUpdate}
                  verified={org.verification_status === 'VERIFIED'}
                />
              )
            )}

            {org && history.length > 0 && (
              <MotionReveal className="charity-org__history">
                <Card>
                  <CardContent>
                    <h2 className="charity-org__history-title">Verification history</h2>
                    <ul className="charity-org__history-list">
                      {history.map((entry) => (
                        <li key={entry.id} className="charity-org__history-item">
                          <span className="charity-org__history-action">
                            {entry.action_display}
                          </span>
                          <span className="charity-org__history-meta">
                            {entry.from_status} → {entry.to_status}
                          </span>
                          <span className="charity-org__history-meta">
                            by {entry.performed_by_name} · {formatDate(entry.created_at)}
                          </span>
                          {entry.reason && (
                            <span className="charity-org__history-reason">{entry.reason}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </MotionReveal>
            )}
          </>
        )}
      </Container>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/*  Form                                                                      */
/* ------------------------------------------------------------------------- */

interface OrgFormProps {
  form: OrgForm;
  fieldErrors: Record<string, string[]>;
  saving: boolean;
  verified: boolean;
  setField: (key: keyof OrgForm, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

function OrgForm({ form, fieldErrors, saving, verified, setField, onSubmit }: OrgFormProps) {
  const errorFor = (key: string) => fieldErrors[key]?.[0];

  return (
    <MotionReveal>
      <Card className="charity-org__card">
        <CardContent>
          <h2 className="charity-org__form-title">
            {verified ? 'Organization details' : 'Organization details'}
          </h2>
          <form className="charity-org__form" onSubmit={onSubmit} noValidate>
            <div className="charity-org__grid">
              <FormField label="Organization name" required error={errorFor('name')}>
                {({ id, invalid }) => (
                  <Input id={id} invalid={invalid} value={form.name} onChange={(e) => setField('name', e.target.value)} required />
                )}
              </FormField>

              <FormField label="Registration number" required error={errorFor('registration_number')}>
                {({ id, invalid }) => (
                  <Input id={id} invalid={invalid} value={form.registration_number} onChange={(e) => setField('registration_number', e.target.value)} required />
                )}
              </FormField>
            </div>

            <FormField label="Description" error={errorFor('description')}>
              {({ id, invalid }) => (
                <Textarea id={id} invalid={invalid} rows={4} value={form.description} onChange={(e) => setField('description', e.target.value)} />
              )}
            </FormField>

            <div className="charity-org__grid">
              <FormField label="Contact email" required error={errorFor('email')}>
                {({ id, invalid }) => (
                  <Input id={id} invalid={invalid} type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} required />
                )}
              </FormField>

              <FormField label="Phone" error={errorFor('phone')}>
                {({ id, invalid }) => (
                  <Input id={id} invalid={invalid} value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                )}
              </FormField>
            </div>

            <FormField label="Website" error={errorFor('website')}>
              {({ id, invalid }) => (
                <Input id={id} invalid={invalid} type="url" value={form.website} onChange={(e) => setField('website', e.target.value)} />
              )}
            </FormField>

            <div className="charity-org__grid">
              <FormField label="Address" error={errorFor('address')}>
                {({ id, invalid }) => (
                  <Input id={id} invalid={invalid} value={form.address} onChange={(e) => setField('address', e.target.value)} />
                )}
              </FormField>

              <FormField label="City" error={errorFor('city')}>
                {({ id, invalid }) => (
                  <Input id={id} invalid={invalid} value={form.city} onChange={(e) => setField('city', e.target.value)} />
                )}
              </FormField>
            </div>

            <div className="charity-org__grid">
              <FormField label="State" error={errorFor('state')}>
                {({ id, invalid }) => (
                  <Input id={id} invalid={invalid} value={form.state} onChange={(e) => setField('state', e.target.value)} />
                )}
              </FormField>

              <FormField label="Country" error={errorFor('country')}>
                {({ id, invalid }) => (
                  <Input id={id} invalid={invalid} value={form.country} onChange={(e) => setField('country', e.target.value)} />
                )}
              </FormField>
            </div>

            <div className="charity-org__actions">
              <Button type="submit" variant="primary" loading={saving}>
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </MotionReveal>
  );
}

function CreateOrgForm({
  form,
  fieldErrors,
  saving,
  setField,
  onSubmit,
}: {
  form: OrgForm;
  fieldErrors: Record<string, string[]>;
  saving: boolean;
  setField: (key: keyof OrgForm, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const errorFor = (key: string) => fieldErrors[key]?.[0];

  return (
    <MotionReveal>
      <Card className="charity-org__card">
        <CardContent>
          <h2 className="charity-org__form-title">Create your organization</h2>
          <p className="charity-org__form-subtitle">
            Create a profile for your charity to start raising funds. You will
            need to be verified before publishing campaigns.
          </p>
          <form className="charity-org__form" onSubmit={onSubmit} noValidate>
            <div className="charity-org__grid">
              <FormField label="Organization name" required error={errorFor('name')}>
                {({ id, invalid }) => (
                  <Input id={id} invalid={invalid} value={form.name} onChange={(e) => setField('name', e.target.value)} required />
                )}
              </FormField>

              <FormField label="Registration number" required error={errorFor('registration_number')}>
                {({ id, invalid }) => (
                  <Input id={id} invalid={invalid} value={form.registration_number} onChange={(e) => setField('registration_number', e.target.value)} required />
                )}
              </FormField>
            </div>

            <FormField label="Description" error={errorFor('description')}>
              {({ id, invalid }) => (
                <Textarea id={id} invalid={invalid} rows={4} value={form.description} onChange={(e) => setField('description', e.target.value)} />
              )}
            </FormField>

            <div className="charity-org__grid">
              <FormField label="Contact email" required error={errorFor('email')}>
                {({ id, invalid }) => (
                  <Input id={id} invalid={invalid} type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} required />
                )}
              </FormField>

              <FormField label="Phone" error={errorFor('phone')}>
                {({ id, invalid }) => (
                  <Input id={id} invalid={invalid} value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                )}
              </FormField>
            </div>

            <FormField label="Website" error={errorFor('website')}>
              {({ id, invalid }) => (
                <Input id={id} invalid={invalid} type="url" value={form.website} onChange={(e) => setField('website', e.target.value)} />
              )}
            </FormField>

            <div className="charity-org__actions">
              <Button type="submit" variant="primary" loading={saving}>
                Create organization
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </MotionReveal>
  );
}
