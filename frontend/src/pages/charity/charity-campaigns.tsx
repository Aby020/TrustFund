import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  EmptyState,
  ErrorState,
  Icon,
  Progress,
  Skeleton,
  useToast,
} from '@/components';
import { MotionReveal } from '@/components/motion/motion-reveal';
import { cancelCampaign, deleteCampaign, listCampaigns } from '@/services/campaigns';
import { getMyOrganization } from '@/services/charity';
import { formatCurrency, formatDate } from '@/utils/format';
import { CAMPAIGN_STATUS_TONES } from '@/types/api';
import type { ApiError, Campaign } from '@/types/api';
import { CharityNav } from './charity-nav';
import './charity-campaigns.css';

/**
 * CharityCampaigns — lists the charity's campaigns with management actions
 * (edit, add updates, cancel, delete). Reads real data via the campaigns API.
 */
export default function CharityCampaignsPage() {
  const { success, error: toastError } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Campaign | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const org = await getMyOrganization();
      const data = await listCampaigns({ page: 1, organization: org.id });
      setCampaigns(data.results);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCancel(campaign: Campaign) {
    setBusyId(campaign.id);
    try {
      await cancelCampaign(campaign.id);
      success('Campaign cancelled');
      load();
    } catch (err) {
      toastError((err as ApiError).message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    try {
      await deleteCampaign(pendingDelete.id);
      success('Campaign deleted');
      setPendingDelete(null);
      load();
    } catch (err) {
      toastError((err as ApiError).message);
      setPendingDelete(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="charity-campaigns">
      <Container>
        <MotionReveal>
          <CharityNav />
        </MotionReveal>

        <MotionReveal className="charity-campaigns__header">
          <div>
            <p className="charity-campaigns__overline">Fundraising</p>
            <h1 className="charity-campaigns__title">Campaigns</h1>
            <p className="charity-campaigns__subtitle">
              Create and manage your fundraising campaigns.
            </p>
          </div>
          <Link to="/charity/manage/campaigns/new" className="charity-campaigns__header-cta">
            <Button variant="primary" size="md">
              <Icon name="target" size={18} aria-hidden="true" />
              Create campaign
            </Button>
          </Link>
        </MotionReveal>

        {loading && (
          <div className="charity-campaigns__skeleton">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="block" height={140} style={{ marginBottom: 12 }} />
            ))}
          </div>
        )}

        {!loading && error && (
          <ErrorState
            title="Could not load campaigns"
            description={error.message}
            actions={<Button variant="primary" onClick={load}>Try again</Button>}
          />
        )}

        {!loading && !error && campaigns.length === 0 && (
          <EmptyState
            title="No campaigns yet"
            description="Create your first campaign to start raising funds for your cause."
            action={
              <Link to="/charity/manage/campaigns/new">
                <Button variant="primary">Create campaign</Button>
              </Link>
            }
          />
        )}

        {!loading && !error && campaigns.length > 0 && (
          <div className="charity-campaigns__list">
            {campaigns.map((campaign, i) => (
              <MotionReveal key={campaign.id} delay={Math.min(i * 0.05, 0.3)}>
                <CampaignCard
                  campaign={campaign}
                  busy={busyId === campaign.id}
                  onCancel={handleCancel}
                  onDelete={() => setPendingDelete(campaign)}
                />
              </MotionReveal>
            ))}
          </div>
        )}
      </Container>

      <Dialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete campaign?"
        description="This will permanently remove the campaign and its updates. This action cannot be undone."
        footer={
          <Button variant="danger" onClick={handleConfirmDelete} loading={busyId !== null}>
            Delete campaign
          </Button>
        }
      >
        {pendingDelete && (
          <p className="charity-campaigns__delete-name">
            <strong>{pendingDelete.title}</strong> will be deleted.
          </p>
        )}
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/*  Campaign card                                                            */
/* ------------------------------------------------------------------------- */

function CampaignCard({
  campaign,
  busy,
  onCancel,
  onDelete,
}: {
  campaign: Campaign;
  busy: boolean;
  onCancel: (campaign: Campaign) => void;
  onDelete: (campaign: Campaign) => void;
}) {
  const raised = Number.parseFloat(campaign.raised_amount);
  const goal = Number.parseFloat(campaign.goal_amount);
  const percent = goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : 0;
  const cancellable = campaign.status === 'DRAFT' || campaign.status === 'ACTIVE';

  return (
    <Card className="charity-campaigns__card">
      <CardContent>
        <div className="charity-campaigns__card-head">
          <div className="charity-campaigns__card-title-wrap">
            <h2 className="charity-campaigns__card-title">{campaign.title}</h2>
            <Badge tone={CAMPAIGN_STATUS_TONES[campaign.status] as 'info' | 'success' | 'danger' | 'warning' | 'neutral'}>
              {campaign.status_display}
            </Badge>
          </div>
          <div className="charity-campaigns__card-actions">
            <Link to={`/charity/manage/campaigns/${campaign.id}/edit`}>
              <Button variant="outline" size="sm">Edit</Button>
            </Link>
            <Link to={`/charity/manage/campaigns/${campaign.id}/updates`}>
              <Button variant="secondary" size="sm">Updates</Button>
            </Link>
            {cancellable && (
              <Button variant="outline" size="sm" loading={busy} onClick={() => onCancel(campaign)}>
                Cancel
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onDelete(campaign)}>
              Delete
            </Button>
          </div>
        </div>

        <p className="charity-campaigns__card-category">{campaign.category_display}</p>
        <p className="charity-campaigns__card-desc">{campaign.description}</p>

        <div className="charity-campaigns__card-progress">
          <div className="charity-campaigns__card-raised">
            <strong>{formatCurrency(campaign.raised_amount)}</strong>
            <span>raised of {formatCurrency(campaign.goal_amount)}</span>
            <span className="charity-campaigns__card-percent">{percent}%</span>
          </div>
          <Progress value={percent} label={`${campaign.title} progress`} />
        </div>

        <div className="charity-campaigns__card-meta">
          <span>{campaign.location}</span>
          <span>Ends {formatDate(campaign.end_date)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
