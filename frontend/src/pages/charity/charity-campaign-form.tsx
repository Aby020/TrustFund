import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  Container,
  ErrorState,
  FormField,
  Input,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '@/components';
import { MotionReveal } from '@/components/motion/motion-reveal';
import {
  createCampaign,
  getCampaign,
  updateCampaign,
} from '@/services/campaigns';
import { CATEGORY_LABELS } from '@/types/api';
import type { ApiError, CampaignCategory } from '@/types/api';
import { CharityNav } from './charity-nav';
import './charity-campaign-form.css';

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [CampaignCategory, string][];

/** Accepted image types for the campaign image upload. */
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** Maximum accepted image size (5 MB). */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

interface CampaignForm {
  title: string;
  description: string;
  category: CampaignCategory | '';
  goal_amount: string;
  location: string;
  start_date: string;
  end_date: string;
}

const EMPTY_FORM: CampaignForm = {
  title: '',
  description: '',
  category: '',
  goal_amount: '',
  location: '',
  start_date: '',
  end_date: '',
};

/**
 * CharityCampaignForm — create or edit a campaign. Used for both the "new"
 * and ":id/edit" routes. Campaigns created by a verified organization go
 * live (ACTIVE) immediately; status transitions on edit are validated by the
 * backend.
 */
export default function CharityCampaignFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const editing = Boolean(id);
  const campaignId = id ? Number(id) : null;

  const [form, setForm] = useState<CampaignForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Image upload state. `existingImageUrl` is the server image in edit mode;
  // `imagePreview` is a blob URL of a newly selected file; `imageFile` holds
  // the actual File to upload.
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current preview: a newly selected file wins over the existing server image.
  const preview = imagePreview ?? existingImageUrl;

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const campaign = await getCampaign(campaignId);
      setForm({
        title: campaign.title ?? '',
        description: campaign.description ?? '',
        category: campaign.category,
        goal_amount: campaign.goal_amount,
        location: campaign.location ?? '',
        start_date: campaign.start_date ? campaign.start_date.slice(0, 10) : '',
        end_date: campaign.end_date ? campaign.end_date.slice(0, 10) : '',
      });
      setExistingImageUrl(campaign.image ?? null);
    } catch (err) {
      setLoadError(err as ApiError);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (editing) load();
  }, [editing, load]);

  // Revoke any blob URLs on unmount to avoid leaks.
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  function setField(key: keyof CampaignForm, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  /** Validate a selected file and stage it for upload. */
  function handleFileSelect(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError('Please upload a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError('Image must be 5 MB or smaller.');
      return;
    }
    setImageError(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  /** Clear a staged upload, returning to the existing image (if any). */
  function handleRemoveImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDropzoneKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }

  /** Open the hidden file picker. */
  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('description', form.description);
    fd.append('category', form.category);
    fd.append('goal_amount', form.goal_amount);
    fd.append('location', form.location);
    if (form.start_date) fd.append('start_date', form.start_date);
    if (form.end_date) fd.append('end_date', form.end_date);
    // Only append the image when a new file is staged. Omitting it on edit
    // preserves the existing image on the server.
    if (imageFile) fd.append('image', imageFile, imageFile.name);
    return fd;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      const formData = buildFormData();

      if (editing && campaignId) {
        await updateCampaign(campaignId, formData);
        success('Campaign updated');
      } else {
        await createCampaign(formData);
        success('Campaign created', 'It is now live for donors to support.');
      }
      navigate('/charity/manage/campaigns');
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

  const errorFor = (key: string) => fieldErrors[key]?.[0];

  return (
    <div className="charity-campaign-form">
      <Container>
        <MotionReveal>
          <CharityNav />
        </MotionReveal>

        <MotionReveal className="charity-campaign-form__header">
          <div>
            <p className="charity-campaign-form__overline">
              {editing ? 'Edit campaign' : 'New campaign'}
            </p>
            <h1 className="charity-campaign-form__title">
              {editing ? 'Edit campaign' : 'Create a campaign'}
            </h1>
            <p className="charity-campaign-form__subtitle">
              {editing
                ? 'Update the details of your campaign.'
                : 'Tell your story and set a fundraising goal. Your campaign goes live immediately.'}
            </p>
          </div>
        </MotionReveal>

        {loading && (
          <div className="charity-campaign-form__skeleton">
            <Skeleton variant="block" height={420} />
          </div>
        )}

        {!loading && loadError && (
          <ErrorState
            title="Could not load campaign"
            description={loadError.message}
            actions={<Button variant="primary" onClick={load}>Try again</Button>}
          />
        )}

        {!loading && !loadError && (
          <MotionReveal>
            <Card className="charity-campaign-form__card">
              <CardContent>
                <form className="charity-campaign-form__form" onSubmit={handleSubmit} noValidate>
                  <FormField label="Campaign title" required error={errorFor('title')}>
                    {({ id, invalid }) => (
                      <Input id={id} invalid={invalid} value={form.title} onChange={(e) => setField('title', e.target.value)} required placeholder="e.g. Medical support for Aisha" />
                    )}
                  </FormField>

                  <FormField label="Description" required error={errorFor('description')}>
                    {({ id, invalid }) => (
                      <Textarea id={id} invalid={invalid} rows={5} value={form.description} onChange={(e) => setField('description', e.target.value)} required placeholder="Explain your cause, who it helps, and how funds will be used." />
                    )}
                  </FormField>

                  <FormField label="Campaign image" error={imageError ?? errorFor('image')}>
                    {({ id }) => (
                      <div
                        id={id}
                        className={`charity-campaign-form__dropzone${isDragging ? ' charity-campaign-form__dropzone--drag' : ''}`}
                        role="button"
                        tabIndex={0}
                        aria-label="Upload a campaign image"
                        onClick={openFilePicker}
                        onKeyDown={handleDropzoneKeyDown}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          handleFileSelect(e.dataTransfer.files?.[0]);
                        }}
                      >
                        {preview ? (
                          <div className="charity-campaign-form__preview">
                            <img src={preview} alt="Campaign image preview" className="charity-campaign-form__preview-img" />
                            <div className="charity-campaign-form__preview-actions">
                              <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                                Replace
                              </Button>
                              <Button type="button" variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}>
                                Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="charity-campaign-form__dropzone-inner">
                            <span className="charity-campaign-form__dropzone-icon" aria-hidden="true">
                              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <path d="M21 15l-5-5L5 21" />
                              </svg>
                            </span>
                            <p className="charity-campaign-form__dropzone-title">
                              Drag &amp; drop an image, or <span className="charity-campaign-form__dropzone-link">browse</span>
                            </p>
                            <p className="charity-campaign-form__dropzone-hint">
                              JPG, PNG or WebP · up to 5 MB
                            </p>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp"
                          className="charity-campaign-form__file-input"
                          hidden
                          onChange={(e) => handleFileSelect(e.target.files?.[0])}
                        />
                      </div>
                    )}
                  </FormField>

                  <div className="charity-campaign-form__grid">
                    <FormField label="Category" required error={errorFor('category')}>
                      {({ id, invalid }) => (
                        <Select id={id} invalid={invalid} value={form.category} onChange={(e) => setField('category', e.target.value)} placeholder="Select a category" required>
                          {CATEGORY_OPTIONS.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </Select>
                      )}
                    </FormField>

                    <FormField label="Goal amount (₹)" required error={errorFor('goal_amount')}>
                      {({ id, invalid }) => (
                        <Input id={id} invalid={invalid} type="number" min="0.01" step="0.01" value={form.goal_amount} onChange={(e) => setField('goal_amount', e.target.value)} required placeholder="e.g. 500000" />
                      )}
                    </FormField>
                  </div>

                  <FormField label="Location" required error={errorFor('location')}>
                    {({ id, invalid }) => (
                      <Input id={id} invalid={invalid} value={form.location} onChange={(e) => setField('location', e.target.value)} required placeholder="e.g. Bengaluru, Karnataka" />
                    )}
                  </FormField>

                  <div className="charity-campaign-form__grid">
                    <FormField label="Start date" error={errorFor('start_date')}>
                      {({ id, invalid }) => (
                        <Input id={id} invalid={invalid} type="date" value={form.start_date} onChange={(e) => setField('start_date', e.target.value)} />
                      )}
                    </FormField>

                    <FormField label="End date" error={errorFor('end_date')}>
                      {({ id, invalid }) => (
                        <Input id={id} invalid={invalid} type="date" value={form.end_date} onChange={(e) => setField('end_date', e.target.value)} />
                      )}
                    </FormField>
                  </div>

                  <div className="charity-campaign-form__actions">
                    <Button type="button" variant="ghost" onClick={() => navigate('/charity/manage/campaigns')}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" loading={saving}>
                      {editing ? 'Save changes' : 'Create campaign'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </MotionReveal>
        )}
      </Container>
    </div>
  );
}
