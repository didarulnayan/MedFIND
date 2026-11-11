// Member 1 - Feature 2: Expiry inventory - 30 / 60 / 90 days and expired (F2-04)
import { useState } from 'react';
import { useApi } from '../../lib/useApi';
import { dateOnly } from '../../lib/format';
import OwnerGate from '../../components/OwnerGate';
import { Chips, EmptyState, LinkButton, Loading, Notice, PageHeader, StatusBadge, Table } from '../../components/ui';

export default function ExpiryInventory() {
  const [range, setRange] = useState('30');
  const { data, error, loading, reload } = useApi('/owner/stock/expiry', { window: range });
  if (error) return <OwnerGate error={error} onRetry={reload} />;
  const c = data && data.counts;

  return (
    <>
      <PageHeader crumbs={[{ label: 'Stock & Expiry', to: '/owner/stock' }, { label: 'Expiry inventory' }]} title="Expiry inventory" subtitle="Medicines with batches expiring soon." />
      <div className="mb-5">
        <Chips value={range} onChange={setRange} options={[
          { value: '30', label: 'Within 30 days', count: c ? c.within30Days : undefined },
          { value: '60', label: 'Within 60 days', count: c ? c.within60Days : undefined },
          { value: '90', label: 'Within 90 days', count: c ? c.within90Days : undefined },
          { value: 'expired', label: 'Expired', count: c ? c.expired : undefined },
        ]} />
      </div>
      {loading && !data ? <Loading /> : data.batches.length === 0 ? (
        <EmptyState icon="✅" title="Nothing expiring in this window">No batches with stock fall in this range.</EmptyState>
      ) : (
        <Table head={['Medicine', 'Batch', 'Quantity', 'Expiry date', 'Warning', 'Action']}>
          {data.batches.map((b) => (
            <tr key={b.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-3.5">
                <p className="font-semibold">{b.medicine.brandName}</p>
                <p className="text-xs text-slate-500">{b.medicine.dosageForm} {b.medicine.strength}</p>
              </td>
              <td className="px-5 py-3.5 font-medium">{b.batchNumber}</td>
              <td className="px-5 py-3.5">{b.quantity}</td>
              <td className="px-5 py-3.5">{dateOnly(b.expiryDate)}</td>
              <td className="px-5 py-3.5"><StatusBadge status={b.status} label={b.warning} /></td>
              <td className="px-5 py-3.5"><LinkButton size="sm" variant="secondary" to={`/owner/stock/${b.catalogItemId}/batches`}>Open batches</LinkButton></td>
            </tr>
          ))}
        </Table>
      )}
      <Notice tone="amber" className="mt-5">Tip: sell or return batches that expire soon. Expired batches are removed from available stock automatically.</Notice>
      <div className="mt-5"><LinkButton to="/owner/stock" variant="secondary">Back to stock overview</LinkButton></div>
    </>
  );
}
