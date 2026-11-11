// Member 1 - Feature 1: Medicine Catalog (F1-01 list, F1-04 remove confirmation)
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { taka, timeAgo } from '../../lib/format';
import OwnerGate from '../../components/OwnerGate';
import { Button, Chips, EmptyState, ErrorBox, LinkButton, Loading, Modal, PageHeader, Pagination, SearchInput, StatusBadge, Table } from '../../components/ui';

export default function CatalogList() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState({ status: 'all', page: 1, limit: 10, search: '' });
  const { data, error, loading, reload } = useApi('/owner/catalog', query);
  const [removing, setRemoving] = useState(null);
  const [removeError, setRemoveError] = useState(null);
  const [busy, setBusy] = useState(false);

  // debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setQuery((q) => (q.search === search ? q : { ...q, search, page: 1 })), 300);
    return () => clearTimeout(t);
  }, [search]);

  async function confirmRemove() {
    setBusy(true);
    setRemoveError(null);
    try {
      await api(`/owner/catalog/${removing.id}`, { method: 'DELETE' });
      setRemoving(null);
      reload();
    } catch (err) {
      setRemoveError(err);
    } finally {
      setBusy(false);
    }
  }

  const c = data && data.counts;
  return (
    <>
      <PageHeader
        title="Medicine catalog"
        subtitle="Medicines your pharmacy sells. Customers see price, stock and last updated time."
        actions={<LinkButton to="/owner/catalog/add">+ Add medicine</LinkButton>}
      />
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <SearchInput className="w-full sm:w-96" placeholder="Search your catalog" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Chips
          value={query.status}
          onChange={(status) => setQuery((q) => ({ ...q, status, page: 1 }))}
          options={[
            { value: 'all', label: 'All', count: c ? c.all : undefined },
            { value: 'in_stock', label: 'In stock' },
            { value: 'low_stock', label: 'Low stock' },
            { value: 'out_of_stock', label: 'Out of stock' },
          ]}
        />
      </div>

      {error ? <OwnerGate error={error} onRetry={reload} /> : loading && !data ? <Loading /> : data.items.length === 0 ? (
        <EmptyState icon="💊" title="No medicines here yet" actions={<LinkButton to="/owner/catalog/add">+ Add medicine</LinkButton>}>
          {query.search || query.status !== 'all' ? 'Nothing matches this search or filter.' : 'Add medicines from the master list to start receiving reservations.'}
        </EmptyState>
      ) : (
        <>
          <Table head={['Medicine', 'Strength / form', 'Price', 'Stock', 'Status', 'Last updated', 'Actions']}>
            {data.items.map((it) => (
              <tr key={it.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5">
                  <p className="font-semibold">{it.medicine.brandName}</p>
                  <p className="text-xs text-slate-500">{it.medicine.genericName}</p>
                </td>
                <td className="px-5 py-3.5">{it.medicine.dosageForm} {it.medicine.strength}</td>
                <td className="px-5 py-3.5 font-medium">{taka(it.price)}</td>
                <td className="px-5 py-3.5">{it.stockQuantity}</td>
                <td className="px-5 py-3.5"><StatusBadge status={it.stockStatus} /></td>
                <td className="px-5 py-3.5 text-slate-600">{timeAgo(it.lastUpdatedAt)}</td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-2">
                    <LinkButton to={`/owner/catalog/${it.id}/edit`} variant="secondary" size="sm">Edit</LinkButton>
                    <Button variant="danger" size="sm" onClick={() => { setRemoveError(null); setRemoving(it); }}>Remove</Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          <Pagination pagination={data.pagination} onPage={(page) => setQuery((q) => ({ ...q, page }))} label={(f, t, total) => `Showing ${f}-${t} of ${total} medicines`} />
        </>
      )}

      <Modal
        open={Boolean(removing)}
        title="Remove from catalog?"
        onClose={() => setRemoving(null)}
        footer={<>
          <Button variant="secondary" onClick={() => setRemoving(null)}>Cancel</Button>
          <Button variant="dangerSolid" loading={busy} onClick={confirmRemove}>Remove medicine</Button>
        </>}
      >
        {removing && (
          <>
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="font-semibold">{removing.medicine.brandName}</p>
              <p className="text-sm text-slate-500">{removing.medicine.genericName} · {removing.medicine.dosageForm} {removing.medicine.strength}</p>
            </div>
            <p className="mt-4 text-sm text-slate-600">Customers will no longer see this medicine at your pharmacy.</p>
            <p className="mt-1 text-sm text-slate-600">Existing reservations are not affected.</p>
            <ErrorBox error={removeError} className="mt-4" />
          </>
        )}
      </Modal>
      <p className="mt-6 text-xs text-slate-400">Prices and stock changes are recorded; <Link className="underline" to="/owner/stock">stock batches</Link> decide the available quantity.</p>
    </>
  );
}
