import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Skeleton,
  Textarea,
  useToast,
} from '@/components';
import { MotionReveal } from '@/components/motion/motion-reveal';
import { listCampaigns } from '@/services/campaigns';
import { getMyOrganization } from '@/services/charity';
import {
  createOpportunity,
  deleteOpportunity,
  listApplications,
  listOpportunities,
  updateApplicationStatus,
  updateOpportunity,
} from '@/services/volunteers';
import { formatDate } from '@/utils/format';
import { APPLICATION_STATUS_TONES, OPPORTUNITY_STATUS_TONES } from '@/types/api';
import type {
  ApiError,
  ApplicationStatus,
  Campaign,
  VolunteerApplication,
  VolunteerOpportunity,
} from '@/types/api';
import { CharityNav } from './charity-nav';
import './charity-volunteers.css';

interface OpportunityForm {
  title: string;
  description: string;
  location: string;
  event_date: string;
  slots_available: string;
  campaign: string;
}

const EMPTY_OPP: OpportunityForm = {
  title: '',
  description: '',
  location: '',
  event_date: '',
  slots_available: '',
  campaign: '',
};

/**
 * CharityVolunteers — manage the charity's volunteer opportunities and
 * review/update applications from volunteers.
 */
export default function CharityVolunteersPage() {
  const { success, error: toastError } = useToast();
  const [opportunities, setOpportunities] = useState<VolunteerOpportunity[]>([]);
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [oppForm, setOppForm] = useState<OpportunityForm>(EMPTY_OPP);
  const [editingOpp, setEditingOpp] = useState<VolunteerOpportunity | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<VolunteerOpportunity | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const org = await getMyOrganization();
      const [opps, apps, camps] = await Promise.all([
        listOpportunities(),
        listApplications(),
        listCampaigns({ page: 1, organization: org.id }),
      ]);
      // The list endpoint returns all opportunities; show only this charity's.
      setOpportunities(opps.results.filter((o) => o.charity_organization === org.id));
      setApplications(apps.results);
      setCampaigns(camps.results);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingCount = useMemo(
    () => applications.filter((a) => a.status === 'PENDING').length,
    [applications],
  );

  function openCreate() {
    setEditingOpp(null);
    setOppForm(EMPTY_OPP);
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEdit(opp: VolunteerOpportunity) {
    setEditingOpp(opp);
    setOppForm({
      title: opp.title,
      description: opp.description,
      location: opp.location,
      event_date: opp.event_date ? opp.event_date.slice(0, 10) : '',
      slots_available: String(opp.slots_available),
      campaign: opp.campaign ? String(opp.campaign) : '',
    });
    setFieldErrors({});
    setFormOpen(true);
  }

  function setField(key: keyof OpportunityForm, value: string) {
    setOppForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  async function handleSubmitOpportunity(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      const org = await getMyOrganization();
      const payload = {
        title: oppForm.title,
        charity_organization: org.id,
        description: oppForm.description,
        location: oppForm.location,
        event_date: oppForm.event_date,
        slots_available: Number(oppForm.slots_available) || 0,
        campaign: oppForm.campaign ? Number(oppForm.campaign) : null,
      };
      if (editingOpp) {
        await updateOpportunity(editingOpp.id, payload);
        await load();
        success('Opportunity updated');
      } else {
        await createOpportunity(payload);
        await load();
        success('Opportunity created');
      }
      setFormOpen(false);
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.fieldErrors) {
        setFieldErrors(apiError.fieldErrors);
        toastError('Please fix the highlighted fields');
      } else {
        toastError(apiError.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setSaving(true);
    try {
      await deleteOpportunity(pendingDelete.id);
      success('Opportunity deleted');
      setPendingDelete(null);
      load();
    } catch (err) {
      toastError((err as ApiError).message);
      setPendingDelete(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleApplicationStatus(app: VolunteerApplication, status: ApplicationStatus) {
    setSaving(true);
    try {
      await updateApplicationStatus(app.id, status);
      success(`Application ${status.toLowerCase()}`);
      load();
    } catch (err) {
      toastError((err as ApiError).message);
    } finally {
      setSaving(false);
    }
  }

  const errorFor = (key: string) => fieldErrors[key]?.[0];

  return (
    <div className="charity-volunteers">
      <Container>
        <MotionReveal>
          <CharityNav />
        </MotionReveal>

        <MotionReveal className="charity-volunteers__header">
          <div>
            <p className="charity-volunteers__overline">Volunteering</p>
            <h1 className="charity-volunteers__title">Volunteers</h1>
            <p className="charity-volunteers__subtitle">
              Post opportunities and manage volunteer applications.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={openCreate}>
            Post opportunity
          </Button>
        </MotionReveal>

        {pendingCount > 0 && !loading && !error && (
          <MotionReveal className="charity-volunteers__pending-banner">
            <Badge tone="info" dot>
              {pendingCount} application{pendingCount === 1 ? '' : 's'} awaiting review
            </Badge>
          </MotionReveal>
        )}

        {loading && (
          <div className="charity-volunteers__skeleton">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="block" height={120} style={{ marginBottom: 12 }} />
            ))}
          </div>
        )}

        {!loading && error && (
          <ErrorState
            title="Could not load volunteers"
            description={error.message}
            actions={<Button variant="primary" onClick={load}>Try again</Button>}
          />
        )}

        {!loading && !error && (
          <div className="charity-volunteers__layout">
            {/* Opportunities */}
            <MotionReveal>
              <Card>
                <CardContent>
                  <div className="charity-volunteers__section-head">
                    <h2 className="charity-volunteers__section-title">Opportunities</h2>
                  </div>
                  {opportunities.length === 0 ? (
                    <EmptyState
                      title="No opportunities"
                      description="Post a volunteer opportunity to recruit helpers."
                      action={<Button variant="primary" onClick={openCreate}>Post opportunity</Button>}
                    />
                  ) : (
                    <ul className="charity-volunteers__list">
                      {opportunities.map((opp) => (
                        <li key={opp.id} className="charity-volunteers__opp">
                          <div className="charity-volunteers__opp-main">
                            <div className="charity-volunteers__opp-head">
                              <h3 className="charity-volunteers__opp-title">{opp.title}</h3>
                              <Badge tone={OPPORTUNITY_STATUS_TONES[opp.status] as 'info' | 'success' | 'neutral'}>
                                {opp.status}
                              </Badge>
                            </div>
                            <p className="charity-volunteers__opp-meta">
                              {opp.location} · {formatDate(opp.event_date)} · {opp.slots_available} slots
                            </p>
                          </div>
                          <div className="charity-volunteers__opp-actions">
                            <Button variant="outline" size="sm" onClick={() => openEdit(opp)}>
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setPendingDelete(opp)}>
                              Delete
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </MotionReveal>

            {/* Applications */}
            <MotionReveal delay={0.1}>
              <Card>
                <CardContent>
                  <div className="charity-volunteers__section-head">
                    <h2 className="charity-volunteers__section-title">Applications</h2>
                  </div>
                  {applications.length === 0 ? (
                    <EmptyState
                      title="No applications"
                      description="Applications from volunteers will appear here."
                    />
                  ) : (
                    <ul className="charity-volunteers__list">
                      {applications.map((app) => (
                        <li key={app.id} className="charity-volunteers__app">
                          <div className="charity-volunteers__app-head">
                            <div>
                              <h3 className="charity-volunteers__app-name">{app.volunteer_name}</h3>
                              <p className="charity-volunteers__app-opp">{app.opportunity_title}</p>
                            </div>
                            <Badge tone={APPLICATION_STATUS_TONES[app.status] as 'warning' | 'success' | 'danger' | 'info'}>
                              {app.status}
                            </Badge>
                          </div>
                          <p className="charity-volunteers__app-statement">{app.statement}</p>
                          <span className="charity-volunteers__app-date">
                            Applied {formatDate(app.applied_at)}
                          </span>
                          {app.status === 'PENDING' && (
                            <div className="charity-volunteers__app-actions">
                              <Button
                                variant="primary"
                                size="sm"
                                loading={saving}
                                onClick={() => handleApplicationStatus(app, 'APPROVED')}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                loading={saving}
                                onClick={() => handleApplicationStatus(app, 'REJECTED')}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </MotionReveal>
          </div>
        )}
      </Container>

      {/* Opportunity form dialog */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingOpp ? 'Edit opportunity' : 'Post opportunity'}
        description="Invite volunteers to support your cause."
        size="lg"
        footer={
          <Button type="submit" form="charity-opportunity-form" variant="primary" loading={saving}>
            {editingOpp ? 'Save changes' : 'Post opportunity'}
          </Button>
        }
      >
        <form
          id="charity-opportunity-form"
          className="charity-volunteers__form"
          onSubmit={handleSubmitOpportunity}
          noValidate
        >
          <FormField label="Title" required error={errorFor('title')}>
            {({ id, invalid }) => (
              <Input id={id} invalid={invalid} value={oppForm.title} onChange={(e) => setField('title', e.target.value)} required placeholder="e.g. Beach cleanup volunteer" />
            )}
          </FormField>
          <FormField label="Description" required error={errorFor('description')}>
            {({ id, invalid }) => (
              <Textarea id={id} invalid={invalid} rows={3} value={oppForm.description} onChange={(e) => setField('description', e.target.value)} required />
            )}
          </FormField>
          <div className="charity-volunteers__form-grid">
            <FormField label="Location" required error={errorFor('location')}>
              {({ id, invalid }) => (
                <Input id={id} invalid={invalid} value={oppForm.location} onChange={(e) => setField('location', e.target.value)} required />
              )}
            </FormField>
            <FormField label="Event date" required error={errorFor('event_date')}>
              {({ id, invalid }) => (
                <Input id={id} invalid={invalid} type="date" value={oppForm.event_date} onChange={(e) => setField('event_date', e.target.value)} required />
              )}
            </FormField>
          </div>
          <div className="charity-volunteers__form-grid">
            <FormField label="Slots available" required error={errorFor('slots_available')}>
              {({ id, invalid }) => (
                <Input id={id} invalid={invalid} type="number" min="0" value={oppForm.slots_available} onChange={(e) => setField('slots_available', e.target.value)} required />
              )}
            </FormField>
            <FormField label="Related campaign" hint="Optional">
              {({ id }) => (
                <select id={id} className="select" value={oppForm.campaign} onChange={(e) => setField('campaign', e.target.value)}>
                  <option value="">No campaign</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              )}
            </FormField>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete opportunity?"
        description="This will remove the opportunity. This cannot be undone."
        footer={
          <Button variant="danger" onClick={handleConfirmDelete} loading={saving}>
            Delete opportunity
          </Button>
        }
      />
    </div>
  );
}
