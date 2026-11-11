// Member 2 - Feature 1: Medicine details with pharmacy availability (F1-01)
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../../lib/useApi';
import { priceRange, taka, timeAgo } from '../../lib/format';
import { Badge, Breadcrumbs, Card, EmptyState, ErrorBox, LinkButton, Loading, Notice, Select, Stars, StatusBadge, VerifiedBadge } from '../../components/ui';

export default function MedicineDetails() {
  const { id } = useParams();
  const [sort, setSort] = useState('price');
  const { data, error, loading, reload } = useApi(`/medicines/${id}`, { sort });

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  const m = data.medicine;

  return (
    <>
      <Breadcrumbs items={[{ label: 'Medicines', to: '/medicines' }, { label: m.brandName }]} />
      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-3xl">💊</span>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">{m.brandName}</h1>
              <p className="text-slate-500">{m.genericName} · {m.manufacturer}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="violet">{m.dosageForm}</Badge>
                <Badge>{m.strength}</Badge>
                <Badge tone={m.requiresPrescription ? 'amber' : 'green'}>{data.prescription}</Badge>
              </div>
              <p className="mt-3 max-w-xl text-xs text-slate-500">{data.disclaimer}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold">{priceRange(data.priceRange, m.unit)}</p>
            <p className="text-sm text-slate-500">across {data.pharmacyCount} pharmac{data.pharmacyCount === 1 ? 'y' : 'ies'}</p>
            <LinkButton to={`/nearby?medicineId=${m.id}`} variant="soft" size="sm" className="mt-3">Find nearby</LinkButton>
          </div>
        </div>
      </Card>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Pharmacies listing this medicine ({data.pharmacyCount})</h2>
          <p className="text-sm text-slate-500">Prices and stock are reported by pharmacies</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          Sort by
          <Select className="w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="price">Lowest price</option>
            <option value="rating">Highest rating</option>
            <option value="updated">Recently updated</option>
            <option value="stock">Most stock</option>
          </Select>
        </label>
      </div>

      {data.pharmacies.length === 0 ? (
        <EmptyState icon="🏥" title="No verified pharmacy lists this medicine yet" actions={<LinkButton to="/medicines" variant="secondary">Search another medicine</LinkButton>} />
      ) : (
        <div className="space-y-3">
          {data.pharmacies.map((l) => (
            <div key={l.catalogItemId} className="grid items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-[1.6fr_repeat(3,1fr)_auto]">
              <div>
                <Link to={`/pharmacies/${l.pharmacy.id}`} className="font-bold hover:text-brand-700">{l.pharmacy.name}, {l.pharmacy.area}</Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  {l.pharmacy.verified && <VerifiedBadge />}
                  <Stars value={l.pharmacy.rating} size="text-sm" />
                  <span className="text-slate-500">{l.pharmacy.rating.toFixed(1)}</span>
                  <Badge tone={l.pharmacy.openNow ? 'green' : 'gray'}>{l.pharmacy.openNow ? 'Open now' : 'Closed'}</Badge>
                </div>
              </div>
              <div><p className="font-bold">{taka(l.price)} / {m.unit}</p><p className="text-xs text-slate-500">Price</p></div>
              <div><StatusBadge status={l.stockStatus} label={`${l.stockStatus} (${l.reportedStock})`} /><p className="mt-1 text-xs text-slate-500">Reported stock</p></div>
              <div><p className="font-medium">{timeAgo(l.lastUpdatedAt)}</p><p className="text-xs text-slate-500">Last updated</p></div>
              {l.canReserve
                ? <LinkButton to={`/medicines/${m.id}/reserve/${l.pharmacy.id}`}>Reserve</LinkButton>
                : <span className="text-sm text-slate-400">Out of stock</span>}
            </div>
          ))}
        </div>
      )}
      <Notice tone="blue" className="mt-6">{data.note} MedFind BD is a discovery and reservation platform, not a medical service.</Notice>
    </>
  );
}
