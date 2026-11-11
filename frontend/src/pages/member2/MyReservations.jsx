// Member 2 - Feature 2: My reservations (F2-01)
import { useState } from 'react';
import { useApi } from '../../lib/useApi';
import { dateTime, taka } from '../../lib/format';
import { Chips, EmptyState, ErrorBox, LinkButton, Loading, PageHeader, Pagination, StatusBadge, Table } from '../../components/ui';

export default function MyReservations() {
  const [query, setQuery] = useState({ tab: 'all', page: 1, limit: 10 });
  const { data, error, loading, reload } = useApi('/reservations/my', query);
  const c = data && data.counts;
  return (
    <>
      <PageHeader title="My reservations" subtitle="Track every reservation request in one place." actions={<LinkButton to="/complaints" variant="secondary">My complaints</LinkButton>} />
      <div className="mb-5">
        <Chips value={query.tab} onChange={(tab) => setQuery({ ...query, tab, page: 1 })} options={[
          { value: 'all', label: 'All', count: c && c.all },
          { value: 'active', label: 'Active', count: c && c.active },
          { value: 'completed', label: 'Completed', count: c && c.completed },
          { value: 'cancelled', label: 'Cancelled', count: c && c.cancelled },
        ]} />
      </div>
      {error ? <ErrorBox error={error} onRetry={reload} /> : loading && !data ? <Loading /> : data.reservations.length === 0 ? (
        <EmptyState icon="🧾" title="No reservations here" actions={<LinkButton to="/">Find a medicine</LinkButton>}>Reserve a medicine from a nearby pharmacy and track it here.</EmptyState>
      ) : (
        <>
          <Table head={['ID', 'Medicine / pharmacy', 'Pickup', 'Total', 'Status', 'Action']}>
            {data.reservations.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5 font-semibold">#{r.code}</td>
                <td className="px-5 py-3.5"><p className="font-medium">{r.medicine}</p><p className="text-xs text-slate-500">{r.pharmacy}</p></td>
                <td className="px-5 py-3.5">{dateTime(r.pickupAt)}</td>
                <td className="px-5 py-3.5">{taka(r.totalPrice)}</td>
                <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-3.5"><LinkButton size="sm" variant="secondary" to={`/reservations/${r.id}`}>View</LinkButton></td>
              </tr>
            ))}
          </Table>
          <Pagination pagination={data.pagination} onPage={(page) => setQuery({ ...query, page })} />
        </>
      )}
    </>
  );
}
