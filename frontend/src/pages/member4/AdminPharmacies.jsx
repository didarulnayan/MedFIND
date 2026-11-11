// Member 4 - Feature 1: Admin - pharmacies pending verification (F1-01)
import { useState } from 'react';
import { useApi } from '../../lib/useApi';
import { Chips, EmptyState, ErrorBox, LinkButton, Loading, PageHeader, Pagination, StatCard, StatusBadge, Table } from '../../components/ui';

export default function AdminPharmacies() {
  const [query, setQuery] = useState({ status: 'Pending', page: 1, limit: 10 });
  const { data, error, loading, reload } = useApi('/admin/pharmacies', query);
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const c = data && data.counts;
  return (
    <>
      <PageHeader title="Pharmacy verification" subtitle="Review newly registered pharmacies against their licence details." />
      {c && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Pending review" value={c.pending} tone="amber" />
          <StatCard label="Verified" value={c.verified} tone="teal" />
          <StatCard label="Rejected" value={c.rejected} tone="red" />
          <StatCard label="Suspended" value={c.suspended} />
        </div>
      )}
      <div className="mb-5">
        <Chips value={query.status} onChange={(status) => setQuery({ ...query, status, page: 1 })} options={[
          { value: 'Pending', label: 'Pending', count: c && c.pending },
          { value: 'Verified', label: 'Verified', count: c && c.verified },
          { value: 'Rejected', label: 'Rejected', count: c && c.rejected },
          { value: 'Suspended', label: 'Suspended', count: c && c.suspended },
        ]} />
      </div>
      {loading && !data ? <Loading /> : data.pharmacies.length === 0 ? <EmptyState icon="✅" title="Nothing in this list" /> : (
        <>
          <Table head={['Pharmacy', 'Owner', 'Trade licence', 'Drug licence', 'Status', 'Action']}>
            {data.pharmacies.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5"><p className="font-semibold">{p.name}</p><p className="text-xs text-slate-500">{p.area}</p></td>
                <td className="px-5 py-3.5">{p.owner}</td>
                <td className="px-5 py-3.5 font-mono text-xs">{p.tradeLicenceNo}</td>
                <td className="px-5 py-3.5 font-mono text-xs">{p.drugLicenceNo}</td>
                <td className="px-5 py-3.5"><StatusBadge status={p.isSuspended ? 'Suspended' : p.status} /></td>
                <td className="px-5 py-3.5"><LinkButton size="sm" variant="secondary" to={`/admin/pharmacies/${p.id}`}>Review</LinkButton></td>
              </tr>
            ))}
          </Table>
          <Pagination pagination={data.pagination} onPage={(page) => setQuery({ ...query, page })} />
        </>
      )}
    </>
  );
}
