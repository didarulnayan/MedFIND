// Member 1 - Feature 1: Add medicine from the master list (F1-02)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import OwnerGate from '../../components/OwnerGate';
import { Badge, Button, Card, ErrorBox, Field, InfoRows, Input, Loading, PageHeader, SearchInput, cx } from '../../components/ui';

export default function AddMedicine() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const { data, error, loading, reload } = useApi('/master-medicines', { search: term, limit: 8 });
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ price: '', stockQuantity: '', minStockLevel: '10' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setTerm(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await api('/owner/catalog', {
        method: 'POST',
        body: { masterMedicineId: selected.id, price: Number(form.price), stockQuantity: Number(form.stockQuantity), minStockLevel: Number(form.minStockLevel || 0) },
      });
      navigate('/owner/catalog');
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Medicine Catalog', to: '/owner/catalog' }, { label: 'Add medicine' }]}
        title="Add medicine to catalog"
        subtitle="Pick a medicine from the master list, then set your own price and stock."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card title="Step 1: Find in master list">
            <SearchInput placeholder="Search brand, generic or manufacturer (e.g. napa)" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="mt-4">
              {error ? <OwnerGate error={error} onRetry={reload} /> : loading && !data ? <Loading /> : data.medicines.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">No master-list medicine matches "{term}".</p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {data.medicines.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        disabled={m.alreadyInCatalog}
                        onClick={() => setSelected(m)}
                        className={cx('flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left text-sm', selected && selected.id === m.id ? 'bg-brand-50 ring-2 ring-inset ring-brand-500' : 'hover:bg-slate-50', m.alreadyInCatalog && 'cursor-not-allowed opacity-60')}
                      >
                        <span>
                          <span className="font-semibold">{m.brandName}</span>
                          <span className="text-slate-500"> · {m.genericName} · {m.manufacturer}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-slate-600">{m.dosageForm} {m.strength}</span>
                          {m.requiresPrescription && <Badge tone="violet">Rx</Badge>}
                          {m.alreadyInCatalog && <Badge>In catalog</Badge>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card title="Step 2: Set your price and stock">
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
              <Field label="Your selling price (per unit)" required>
                <Input type="number" step="0.01" min="0.01" required value={form.price} onChange={set('price')} suffix="Tk" placeholder="1.20" />
              </Field>
              <Field label="Stock quantity" required>
                <Input type="number" min="0" step="1" required value={form.stockQuantity} onChange={set('stockQuantity')} suffix="units" placeholder="340" />
              </Field>
              <Field label="Minimum stock level" hint="For the low-stock alert">
                <Input type="number" min="0" step="1" value={form.minStockLevel} onChange={set('minStockLevel')} suffix="units" />
              </Field>
              <p className="text-sm text-slate-500 sm:col-span-3">Last updated will be set to now when you save.</p>
              <ErrorBox error={saveError} className="sm:col-span-3" />
              <div className="flex gap-3 sm:col-span-3">
                <Button type="button" variant="secondary" onClick={() => navigate('/owner/catalog')}>Cancel</Button>
                <Button type="submit" loading={saving} disabled={!selected}>Add to catalog</Button>
              </div>
            </form>
          </Card>
        </div>

        <Card title="Selected medicine (read-only)" className="h-fit lg:sticky lg:top-24">
          {selected ? (
            <InfoRows rows={[
              ['Brand', selected.brandName],
              ['Generic', selected.genericName],
              ['Manufacturer', selected.manufacturer],
              ['Strength / form', `${selected.strength} / ${selected.dosageForm}`],
              ['Prescription', selected.requiresPrescription ? 'Required' : 'Not required'],
            ]} />
          ) : <p className="text-sm text-slate-500">Choose a medicine from the master list.</p>}
        </Card>
      </div>
    </>
  );
}
