import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { ToastProvider } from '@/components';
import { AuthProvider } from '@/context/auth-context';
import CharityCampaignFormPage from './charity-campaign-form';

/* -------------------------------------------------------------------------- */
/*  Mock services                                                              */
/* -------------------------------------------------------------------------- */

const mockCreateCampaign = vi.fn();
const mockUpdateCampaign = vi.fn();
const mockGetCampaign = vi.fn();

vi.mock('@/services/campaigns', () => ({
  listCampaigns: vi.fn(),
  getCampaign: (...args: unknown[]) => mockGetCampaign(...args),
  listCampaignUpdates: vi.fn(),
  createCampaign: (...args: unknown[]) => mockCreateCampaign(...args),
  updateCampaign: (...args: unknown[]) => mockUpdateCampaign(...args),
  deleteCampaign: vi.fn(),
  cancelCampaign: vi.fn(),
  createCampaignUpdate: vi.fn(),
  updateCampaignUpdate: vi.fn(),
  deleteCampaignUpdate: vi.fn(),
}));

const CAMPAIGN = {
  id: 1,
  organization: 1,
  organization_name: 'Hope Foundation',
  title: 'Help Build a School',
  description: 'Building a school.',
  category: 'EDUCATION',
  category_display: 'Education',
  goal_amount: '500000',
  raised_amount: '0.00',
  location: 'Mumbai',
  image: 'http://localhost:8000/media/campaigns/school.png',
  start_date: '2026-08-01',
  end_date: '2026-12-31',
  status: 'DRAFT',
  status_display: 'Draft',
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
};

function makeFile(name: string, type: string, bytes = 'fake-image') {
  return new File([bytes], name, { type });
}

function renderForm(path = '/charity/manage/campaigns/new') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/charity/manage/campaigns/new" element={<CharityCampaignFormPage />} />
            <Route path="/charity/manage/campaigns/:id/edit" element={<CharityCampaignFormPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/campaign title/i), 'Help Build a School');
  await user.type(screen.getByLabelText(/^description/i), 'Building a school.');
  await user.selectOptions(screen.getByLabelText(/^category/i), 'EDUCATION');
  await user.type(screen.getByLabelText(/goal amount/i), '500000');
  await user.type(screen.getByLabelText(/^location/i), 'Mumbai');
}

function fileInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]');
  if (!input) throw new Error('file input not found');
  return input as HTMLInputElement;
}

/* -------------------------------------------------------------------------- */
/*  Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe('CharityCampaignFormPage image upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Override the object-URL methods while keeping URL usable as a constructor.
    vi.stubGlobal('URL', Object.assign(URL, {
      createObjectURL: vi.fn(() => 'blob:campaign-preview'),
      revokeObjectURL: vi.fn(),
    }));
    mockCreateCampaign.mockResolvedValue(CAMPAIGN);
    mockUpdateCampaign.mockResolvedValue(CAMPAIGN);
    mockGetCampaign.mockResolvedValue(CAMPAIGN);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the image upload area', async () => {
    renderForm();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Upload a campaign image' })).toBeInTheDocument();
    });
    expect(screen.getByText(/drag & drop an image/i)).toBeInTheDocument();
    expect(screen.getByText(/jpg, png or webp/i)).toBeInTheDocument();
  });

  it('shows a preview when a file is selected', async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Upload a campaign image' })).toBeInTheDocument();
    });

    await user.upload(fileInput(), makeFile('school.png', 'image/png'));

    const preview = await screen.findByAltText('Campaign image preview');
    expect(preview).toHaveAttribute('src', 'blob:campaign-preview');
    expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });

  it('removes the preview when Remove is clicked', async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Upload a campaign image' })).toBeInTheDocument();
    });

    await user.upload(fileInput(), makeFile('school.png', 'image/png'));
    await screen.findByAltText('Campaign image preview');

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(screen.queryByAltText('Campaign image preview')).not.toBeInTheDocument();
    expect(screen.getByText(/drag & drop an image/i)).toBeInTheDocument();
  });

  it('rejects an invalid file type with a message', async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Upload a campaign image' })).toBeInTheDocument();
    });

    // userEvent enforces the `accept` attribute, so widen it to let the
    // invalid file reach the validator.
    fileInput().accept = '';
    await user.upload(fileInput(), makeFile('notes.txt', 'text/plain'));

    expect(screen.getByText(/jpg, png, or webp/i)).toBeInTheDocument();
    expect(screen.queryByAltText('Campaign image preview')).not.toBeInTheDocument();
  });

  it('rejects an oversized file with a message', async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Upload a campaign image' })).toBeInTheDocument();
    });

    const big = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    await user.upload(fileInput(), big);

    expect(screen.getByText(/5 mb or smaller/i)).toBeInTheDocument();
    expect(screen.queryByAltText('Campaign image preview')).not.toBeInTheDocument();
  });

  it('submits a new campaign with FormData including the image', async () => {
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Upload a campaign image' })).toBeInTheDocument();
    });

    const image = makeFile('school.png', 'image/png');
    await user.upload(fileInput(), image);
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Create campaign' }));

    await waitFor(() => {
      expect(mockCreateCampaign).toHaveBeenCalledTimes(1);
    });
    const fd = mockCreateCampaign.mock.calls[0][0] as FormData;
    expect(fd).toBeInstanceOf(FormData);
    expect(fd.get('title')).toBe('Help Build a School');
    expect(fd.get('category')).toBe('EDUCATION');
    expect(fd.get('goal_amount')).toBe('500000');
    expect(fd.get('image')).toBeInstanceOf(File);
    expect((fd.get('image') as File).name).toBe('school.png');
  });

  it('shows the existing image in edit mode', async () => {
    renderForm('/charity/manage/campaigns/1/edit');
    const preview = await screen.findByAltText('Campaign image preview');
    expect(preview).toHaveAttribute('src', CAMPAIGN.image);
  });

  it('preserves the existing image when editing other fields', async () => {
    const user = userEvent.setup();
    renderForm('/charity/manage/campaigns/1/edit');
    await screen.findByAltText('Campaign image preview');

    await user.clear(screen.getByLabelText(/campaign title/i));
    await user.type(screen.getByLabelText(/campaign title/i), 'Renamed School');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mockUpdateCampaign).toHaveBeenCalledTimes(1);
    });
    const fd = mockUpdateCampaign.mock.calls[0][1] as FormData;
    expect(fd).toBeInstanceOf(FormData);
    expect(fd.get('title')).toBe('Renamed School');
    // No image key → the existing server image is preserved.
    expect(fd.get('image')).toBeNull();
  });

  it('replaces the existing image in edit mode when a new file is selected', async () => {
    const user = userEvent.setup();
    renderForm('/charity/manage/campaigns/1/edit');
    await screen.findByAltText('Campaign image preview');

    const replacement = makeFile('new.png', 'image/png');
    await user.upload(fileInput(), replacement);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mockUpdateCampaign).toHaveBeenCalledTimes(1);
    });
    const fd = mockUpdateCampaign.mock.calls[0][1] as FormData;
    expect(fd.get('image')).toBeInstanceOf(File);
    expect((fd.get('image') as File).name).toBe('new.png');
  });
});
