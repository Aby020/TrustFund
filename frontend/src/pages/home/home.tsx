import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Container,
  Dialog,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
  EmptyState,
  FormField,
  Input,
  Progress,
  Section,
  Skeleton,
  Spinner,
  useToast,
} from '@/components';
import './home.css';

/**
 * Home — the Task 13A foundation page. It deliberately demonstrates the live
 * design system (components prove themselves here) instead of pretending to
 * be a finished marketing page. Feature pages land in later tasks.
 */
export default function HomePage() {
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checked, setChecked] = useState(true);
  const [name, setName] = useState('');

  const submitDemo = () => {
    if (!name.trim()) {
      toast.error('Name is required', 'Fill the field and try again.');
      return;
    }
    toast.success('Welcome to TrustFund', `Nice to meet you, ${name.trim()}.`);
    setName('');
  };

  return (
    <div className="home">
      <section className="home__hero" aria-labelledby="home-title">
        <Container>
          <p className="overline home__eyebrow">
            <Badge tone="accent" dot>Foundation 13A</Badge>
            Frontend foundation + design system
          </p>
          <h1 id="home-title">A premium home for giving.</h1>
          <p className="lead">
            TrustFund’s frontend foundation is live: a token-driven design
            system, reusable components, and an app shell ready for the
            campaign, charity, donation and auth pages in Task 13B and beyond.
          </p>
        </Container>
      </section>

      <Section>
        <Container>
          <Section
            overline="Design system"
            heading="Components, live"
            description="Every primitive below is the real design-system component — variants, states, loading, and accessibility included. Use this page to eyeball the foundation as future tasks build on it."
          />

          <div className="home__grid">
            <Card>
              <CardHeader>
                <CardTitle>Buttons</CardTitle>
                <CardDescription>Primary, secondary, outline, ghost, danger.</CardDescription>
              </CardHeader>
              <CardContent className="home__stack">
                <div className="home__chips">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                </div>
                <div className="home__chips">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                  <Button loading>Loading</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Badges &amp; status</CardTitle>
                <CardDescription>Tones map to TrustFund statuses.</CardDescription>
              </CardHeader>
              <CardContent className="home__stack">
                <div className="home__chips">
                  <Badge>Neutral</Badge>
                  <Badge tone="accent">Accent</Badge>
                  <Badge tone="success" dot>Verified</Badge>
                  <Badge tone="warning" dot>Pending</Badge>
                  <Badge tone="danger" dot>Rejected</Badge>
                  <Badge tone="info">Info</Badge>
                </div>
                <Progress value={63} label="Campaign goal" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Forms</CardTitle>
                <CardDescription>Labeled fields with error + hint wiring.</CardDescription>
              </CardHeader>
              <CardContent className="home__stack">
                <FormField
                  label="Your name"
                  hint="We only use this to greet you."
                  error={!name.trim() ? '' : undefined}
                >
                  {({ id, invalid }) => (
                    <Input
                      id={id}
                      placeholder="Aarav Sharma"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      invalid={invalid}
                    />
                  )}
                </FormField>
                <Checkbox
                  id="newsletter"
                  label="Send me campaign updates occasionally"
                  checked={checked}
                  onChange={(event) => setChecked(event.target.checked)}
                />
                <Button onClick={submitDemo}>Greet me</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Overlays</CardTitle>
                <CardDescription>Dialog, dropdown, and toast in action.</CardDescription>
              </CardHeader>
              <CardContent className="home__stack">
                <div className="home__field-row">
                  <Button variant="outline" onClick={() => setDialogOpen(true)}>
                    Open dialog
                  </Button>

                  <Dropdown label="Menu">
                    <DropdownItem icon={<SettingsIcon />}>Settings</DropdownItem>
                    <DropdownItem icon={<HelpIcon />}>Help center</DropdownItem>
                    <DropdownSeparator />
                    <DropdownItem destructive>Delete</DropdownItem>
                  </Dropdown>

                  <Button variant="secondary" onClick={() => toast.warning('Heads up', 'You are in preview mode.')}>
                    Show toast
                  </Button>
                </div>
                <p className="home__note">
                  Dialogs trap focus and close on Esc; menus are fully keyboard
                  navigable; toasts land in a polite live region.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>States</CardTitle>
                <CardDescription>Loading and empty primitives.</CardDescription>
              </CardHeader>
              <CardContent className="home__stack">
                <div className="home__chips">
                  <Spinner label="Loading" />
                  <Button loading>Submitting</Button>
                </div>
                <div className="home__field-row">
                  <Skeleton width={160} height={20} />
                  <Skeleton variant="circle" width={40} height={40} />
                </div>
                <EmptyState
                  title="No campaigns yet"
                  description="When campaigns exist, they’ll appear here with a clear next step."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What’s next</CardTitle>
                <CardDescription>How Task 13B composes on top of this.</CardDescription>
              </CardHeader>
              <CardContent className="home__stack">
                <ul className="home__list">
                  <li>Campaign and charity browsing pages</li>
                  <li>Donation + Razorpay checkout flow</li>
                  <li>Auth pages (JWT) behind the existing layout</li>
                  <li>Role-aware dashboards</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </Container>
      </Section>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Confirm your details"
        description="This dialog uses the native <dialog> element for focus trapping and Esc support."
        footer={<Button onClick={() => setDialogOpen(false)}>Got it</Button>}
      >
        <p className="home__note">
          The body renders here. Header close, backdrop, Esc, and focus restore
          are all handled by the foundation component.
        </p>
      </Dialog>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4M12 17.5v.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}