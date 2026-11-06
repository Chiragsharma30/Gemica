import { EmptyState } from '../components/States';

export default function NotFound() {
  return <div className="container"><EmptyState title="Page not found" message="The page you're looking for doesn't exist." actionTo="/" actionLabel="Go home" /></div>;
}
