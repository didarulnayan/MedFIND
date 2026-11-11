import { EmptyState, ErrorBox, LinkButton } from './ui';

/** Owner pages: if the owner has no pharmacy yet, guide them to registration instead of showing a raw error. */
export default function OwnerGate({ error, onRetry }) {
  if (error && error.status === 404 && /registered a pharmacy/i.test(error.message)) {
    return (
      <EmptyState icon="🏥" title="Register your pharmacy first" actions={<LinkButton to="/owner/pharmacy">Register pharmacy</LinkButton>}>
        Submit your pharmacy details and licence numbers. You can manage your catalog while an admin verifies them.
      </EmptyState>
    );
  }
  return <ErrorBox error={error} onRetry={onRetry} />;
}
