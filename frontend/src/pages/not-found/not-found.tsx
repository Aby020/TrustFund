import { Link } from 'react-router-dom';
import { Container, EmptyState } from '@/components';

export default function NotFoundPage() {
  return (
    <Container className="section">
      <EmptyState
        title="Page not found"
        description="The page you’re looking for doesn’t exist or has moved. Double-check the address or head back home."
        action={
          <Link className="button button--primary button--md" to="/">
            Back to home
          </Link>
        }
      />
    </Container>
  );
}