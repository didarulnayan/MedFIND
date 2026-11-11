// Member 2 - Feature 2: Owner reservation inbox (F2-03)
import { useState } from 'react';
import { useApi } from '../../lib/useApi';
import { dateTime } from '../../lib/format';
import OwnerGate from '../../components/OwnerGate';
import { Chips, EmptyState, LinkButton, Loading, PageHeader, Pagination, StatCard, StatusBadge, Table } from '../../components/ui';

export default function OwnerInbox() {
  const [query, setQuery] = useState({ status: 'Pending', page: 1, limit: 10 });
  const { data, error, loading, reload } = useApi('/owner/reservations', query);
  if (error) return <OwnerGate error={error} onRetry={reload} />;
  const c = data && data.counts;
  return (
    <>
      <PageHeader title="Reservation requests" subtitle="Respond to requests from patients." />
      {c && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Pending" value={c.pending} tone="amber" />
          <StatCard label="Confirmed" value={c.confirmed} />
          <StatCard label="Ready for pickup" value={c.readyForPickup} tone="teal" />
          <StatCard label="Collected today" value={c.collectedToday} />
        </div>
      )}
      <div className="mb-5">
        <Chips value={query.status} onChange={(status) => setQuery({ ...query, status, page: 1 })} options={[
          { value: 'Pending', label: 'Pending', count: c && c.pending },
          { value: 'Confirmed', label: 'Confirmed', count: c && c.confirmed },
          { value: 'ReadyForPickup', label: 'Ready', count: c && c.readyForPickup },
          { value: 'Collected', label: 'Collected' },
          { value: 'Rejected', label: 'Rejected' },
          { value: 'Expired', label: 'Expired' },
        ]} />
      </div>
      {loading && !data ? <Loading /> : data.reservations.length === 0 ? (
        <EmptyState icon="📭" title="No reservations in this list">New requests appear here as soon as patients send them.</EmptyState>
      ) : (
        <>
          <Table head={['ID', 'Patient', 'Medicine', 'Pickup', 'Status', 'Action']}>
            {data.reservations.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5 font-semibold">#{r.code}</td>
                <td className="px-5 py-3.5"><p className="font-medium">{r.patient.name}</p><p className="text-xs text-slate-500">{r.patient.phone || '-'}</p></td>
                <td className="px-5 py-3.5">{r.medicine}</td>
                <td className="px-5 py-3.5">{dateTime(r.pickupAt)}</td>
                <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-3.5"><LinkButton size="sm" variant="secondary" to={`/owner/reservations/${r.id}`}>Review</LinkButton></td>
              </tr>
            ))}
          </Table>
          <Pagination pagination={data.pagination} onPage={(page) => setQuery({ ...query, page })} />
        </>
      )}
    </>
  );
}
