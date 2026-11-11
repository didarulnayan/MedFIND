// Member 1 - Feature 2: Stock overview (F2-01)
import { useEffect, useState } from 'react';
import { useApi } from '../../lib/useApi';
import { dateOnly } from '../../lib/format';
import OwnerGate from '../../components/OwnerGate';
import { EmptyState, LinkButton, Loading, PageHeader, SearchInput, StatCard, StatusBadge, Table } from '../../components/ui';

export default function StockOverview() {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const { data, error, loading, reload } = useApi('/owner/stock/overview', { search: term });

  useEffect(() => {
    const t = setTimeout(() => setTerm(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  if (error) return <OwnerGate error={error} onRetry={reload} />;
  const s = data && data.summary;
  return (
    <>
      <PageHeader title="Stock & expiry" subtitle="Available stock counts only non-expired batches." actions={<LinkButton to="/owner/stock/add-batch">+ Add batch</LinkButton>} />
      {s && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Medicines tracked" value={s.medicinesTracked} />
          <StatCard label="Available units" value={s.availableUnits.toLocaleString()} tone="teal" />
          <StatCard label="Expiring in 30 days" value={s.expiringIn30Days} tone="amber" />
          <StatCard label="Expired batches" value={s.expiredBatches} tone="red" />
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <SearchInput className="w-full sm:w-96" placeholder="Search medicine" value={search} onChange={(e) => setSearch(e.target.value)} />
        <LinkButton to="/owner/stock/expiry" variant="secondary">View expiry inventory</LinkButton>
      </div>
      {loading && !data ? <Loading /> : data.items.length === 0 ? (
        <EmptyState icon="📦" title="No medicines to track" actions={<LinkButton to="/owner/catalog/add">Add a medicine</LinkButton>}>
          Add medicines to your catalog, then record each delivery as a batch.
        </EmptyState>
      ) : (
        <Table head={['Medicine', 'Available stock', 'Batches', 'Earliest expiry', 'Status', 'Actions']}>
          {data.items.map((it) => (
            <tr key={it.catalogItemId} className="hover:bg-slate-50/60">
              <td className="px-5 py-3.5">
                <p className="font-semibold">{it.medicine.brandName}</p>
                <p className="text-xs text-slate-500">{it.medicine.dosageForm} {it.medicine.strength}</p>
              </td>
              <td className="px-5 py-3.5 font-medium">{it.availableStock}</td>
              <td className="px-5 py-3.5">{it.batches}</td>
              <td className="px-5 py-3.5">{dateOnly(it.earliestExpiry)}</td>
              <td className="px-5 py-3.5"><StatusBadge status={it.status} /></td>
              <td className="px-5 py-3.5">
                <div className="flex gap-2">
                  <LinkButton size="sm" variant="secondary" to={`/owner/stock/${it.catalogItemId}/batches`}>Batches</LinkButton>
                  <LinkButton size="sm" variant="soft" to={`/owner/stock/add-batch?item=${it.catalogItemId}`}>+ Batch</LinkButton>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
