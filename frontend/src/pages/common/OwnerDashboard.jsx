// Common owner landing page: summary of the owner's features
import { useApi } from '../../lib/useApi';
import { useAuth } from '../../context/AuthContext';
import OwnerGate from '../../components/OwnerGate';
import { Card, LinkButton, Loading, Notice, PageHeader, StatCard } from '../../components/ui';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const { data: v, error: vError } = useApi('/pharmacies/mine/verification');
  const { data: inbox, error } = useApi(v ? '/owner/reservations' : null, { status: 'Pending', limit: 1 });
  const { data: stock } = useApi(v ? '/owner/stock/overview' : null);

  if (vError) return <OwnerGate error={vError.status === 404 ? { status: 404, message: 'You have not registered a pharmacy yet' } : vError} />;
  if (!v) return <Loading />;

  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(' ')[0]}`} subtitle={v.name} />
      {v.status !== 'Verified' && <Notice tone="amber" className="mb-6" title={`Verification: ${v.status}`}>Patients cannot see your pharmacy until an admin verifies it. <LinkButton to="/owner/pharmacy" variant="ghost" size="sm">View details</LinkButton></Notice>}
      {v.isSuspended && <Notice tone="red" className="mb-6">Your pharmacy is suspended and hidden from search.</Notice>}
      {error ? <OwnerGate error={error} /> : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Pending requests" value={inbox ? inbox.counts.pending : '-'} tone="amber" />
          <StatCard label="Ready for pickup" value={inbox ? inbox.counts.readyForPickup : '-'} tone="teal" />
          <StatCard label="Available units" value={stock ? stock.summary.availableUnits.toLocaleString() : '-'} />
          <StatCard label="Expiring in 30 days" value={stock ? stock.summary.expiringIn30Days : '-'} tone="red" />
        </div>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          ['Reservations', 'Confirm, prepare and hand over requests.', '/owner/reservations'],
          ['Medicine catalog', 'Prices, stock and what customers see.', '/owner/catalog'],
          ['Stock & expiry', 'Batches, expiry dates and what to use first.', '/owner/stock'],
        ].map(([title, text, to]) => (
          <Card key={to}>
            <p className="font-bold">{title}</p>
            <p className="mb-4 mt-1 text-sm text-slate-500">{text}</p>
            <LinkButton to={to} variant="soft" size="sm">Open</LinkButton>
          </Card>
        ))}
      </div>
    </>
  );
}
