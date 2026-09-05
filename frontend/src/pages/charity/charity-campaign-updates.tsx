import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
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
import {
  createCampaignUpdate,
  deleteCampaignUpdate,
  getCampaign,
  listCampaignUpdates,
  updateCampaignUpdate,
} from '@/services/campaigns';
import { formatDate } from '@/utils/format';
import type { ApiError, Campaign, CampaignUpdate } from '@/types/api';
import { CharityNav } from './charity-nav';
import './charity-campaign-updates.css';

interface UpdateDraft {
  title: string;
  content: string;
}

const EMPTY_DRAFT: UpdateDraft = { title: '', content: '' };

/**
 * CharityCampaignUpdates — manage the timeline of updates for a single
 * campaign. Charities can create, edit, and delete updates.
 */
export default function CharityCampaignUpdatesPage() {
  const { id } = useParams<{ id: string }>();
  const campaignId = id ? Number(id) : null;
  const { success, error: toastError } = useToast();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
  const [draft, setDraft] = useState<UpdateDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CampaignUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const [camp, updatesData] = await Promise.all([
        getCampaign(campaignId),
        listCampaignUpdates(campaignId),
      ]);
      setCampaign(camp);
      setUpdates(updatesData.results);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    load();
  }, [load]);

  function setField(key: keyof UpdateDraft, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function startEdit(update: CampaignUpdate) {
    setEditingId(update.id);
    setDraft({ title: update.title, content: update.content });
    setFieldErrors({});
  }

  function resetForm() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setFieldErrors({});
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignId) return;
    setSaving(true);
    setFieldErrors({});
    try {
      if (editingId) {
        await updateCampaignUpdate(editingId, draft);
        success('Update saved');
      } else {
        await createCampaignUpdate(campaignId, draft);
        success('Update posted');
      }
      resetForm();
      load();
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
      await deleteCampaignUpdate(pendingDelete.id);
      success('Update deleted');
      setPendingDelete(null);
      if (editingId === pendingDelete.id) resetForm();
      load();
    } catch (err) {
      toastError((err as ApiError).message);
      setPendingDelete(null);
    } finally {
      setSaving(false);
    }
  }

  const errorFor = (key: string) => fieldErrors[key]?.[0];

  return (
    <div className="charity-updates">
      <Container>
        <MotionReveal>
          <CharityNav />
        </MotionReveal>

        <MotionReveal className="charity-updates__header">
          <div>
            <p className="charity-updates__overline">Campaign updates</p>
            <h1 className="charity-updates__title">
              {campaign?.title ?? 'Campaign updates'}
            </h1>
            <p className="charity-updates__subtitle">
              Keep donors informed with progress updates and announcements.
            </p>
          </div>
          <Link to={`/charity/manage/campaigns/${campaignId}/edit`}>
            <Button variant="outline" size="md">Back to campaign</Button>
          </Link>
        </MotionReveal>

        {loading && (
          <div className="charity-updates__skeleton">
            <Skeleton variant="block" height={300} />
          </div>
        )}

        {!loading && error && (
          <ErrorState
            title="Could not load updates"
            description={error.message}
            actions={<Button variant="primary" onClick={load}>Try again</Button>}
          />
        )}

        {!loading && !error && (
          <div className="charity-updates__layout">
            {/* Composer */}
            <MotionReveal>
              <Card className="charity-updates__composer">
                <CardContent>
                  <h2 className="charity-updates__composer-title">
                    {editingId ? 'Edit update' : 'Post an update'}
                  </h2>
                  <form className="charity-updates__form" onSubmit={handleSubmit} noValidate>
                    <FormField label="Title" required error={errorFor('title')}>
                      {({ id, invalid }) => (
                        <Input id={id} invalid={invalid} value={draft.title} onChange={(e) => setField('title', e.target.value)} required placeholder="e.g. First milestone reached" />
                      )}
                    </FormField>
                    <FormField label="Content" required error={errorFor('content')}>
                      {({ id, invalid }) => (
                        <Textarea id={id} invalid={invalid} rows={5} value={draft.content} onChange={(e) => setField('content', e.target.value)} required placeholder="Share news, progress, and how funds are being used." />
                      )}
                    </FormField>
                    <div className="charity-updates__composer-actions">
                      {editingId && (
                        <Button type="button" variant="ghost" onClick={resetForm}>
                          Cancel
                        </Button>
                      )}
                      <Button type="submit" variant="primary" loading={saving}>
                        {editingId ? 'Save update' : 'Post update'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </MotionReveal>

            {/* Timeline */}
            <MotionReveal delay={0.1}>
              <Card className="charity-updates__list-card">
                <CardContent>
                  <h2 className="charity-updates__list-title">Timeline</h2>
                  {updates.length === 0 ? (
                    <EmptyState
                      title="No updates yet"
                      description="Post your first update to keep donors engaged."
                    />
                  ) : (
                    <ul className="charity-updates__list">
                      {updates.map((update) => (
                        <li key={update.id} className="charity-updates__item">
                          <div className="charity-updates__item-head">
                            <h3 className="charity-updates__item-title">{update.title}</h3>
                            <div className="charity-updates__item-actions">
                              <Button variant="ghost" size="sm" onClick={() => startEdit(update)}>
                                Edit
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setPendingDelete(update)}>
                                Delete
                              </Button>
                            </div>
                          </div>
                          <p className="charity-updates__item-content">{update.content}</p>
                          <span className="charity-updates__item-meta">
                            {update.created_by_name} · {formatDate(update.created_at)}
                          </span>
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

      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete update?"
        description="This will permanently remove this update from the campaign timeline."
        footer={
          <Button variant="danger" onClick={handleConfirmDelete} loading={saving}>
            Delete update
          </Button>
        }
      />
    </div>
  );
}
