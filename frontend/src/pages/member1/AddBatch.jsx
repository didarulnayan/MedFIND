// Member 1 - Feature 2: Add stock batch (F2-02)
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { localDate } from '../../lib/format';
import OwnerGate from '../../components/OwnerGate';
import { Button, Card, ErrorBox, Field, Input, Loading, Notice, PageHeader, Select } from '../../components/ui';

const RULES = [
  ['Non-expired only', 'Expired batches never count as available'],
  ['Earliest expiry first', 'Reservations use the batch that expires first'],
  ['Auto update', 'Stock reduces when a reservation is collected'],
];

export default function AddBatch() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data, error, loading, reload } = useApi('/owner/stock/overview');
  const [form, setForm] = useState({ catalogItemId: params.get('item') || '', batchNumber: '', quantity: '', manufacturingDate: '', expiryDate: '', purchasePrice: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const current = useMemo(() => data && data.items.find((i) => i.catalogItemId === form.catalogItemId), [data, form.catalogItemId]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const body = { catalogItemId: form.catalogItemId, batchNumber: form.batchNumber, quantity: Number(form.quantity), expiryDate: form.expiryDate };
    if (form.manufacturingDate) body.manufacturingDate = form.manufacturingDate;
    if (form.purchasePrice) body.purchasePrice = Number(form.purchasePrice);
    try {
      await api('/owner/stock/batches', { method: 'POST', body });
      navigate(`/owner/stock/${form.catalogItemId}/batches`);
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  if (error) return <OwnerGate error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  const qty = Number(form.quantity) || 0;

  return (
    <>
      <PageHeader crumbs={[{ label: 'Stock & Expiry', to: '/owner/stock' }, { label: 'Add batch' }]} title="Add stock batch" subtitle="Record each delivery as a batch with its own expiry date." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Medicine" required className="sm:col-span-2">
              <Select required value={form.catalogItemId} onChange={set('catalogItemId')}>
                <option value="">Choose a medicine from your catalog</option>
                {data.items.map((i) => (
                  <option key={i.catalogItemId} value={i.catalogItemId}>{i.medicine.brandName} {i.medicine.strength} ({i.medicine.genericName})</option>
                ))}
              </Select>
            </Field>
            <Field label="Batch number" required hint="Letters, numbers and dashes, e.g. NP-2412">
              <Input required value={form.batchNumber} onChange={set('batchNumber')} placeholder="NP-2412" pattern="[A-Za-z0-9-]+" />
            </Field>
            <Field label="Quantity received" required>
              <Input type="number" min="1" step="1" required value={form.quantity} onChange={set('quantity')} suffix="units" placeholder="200" />
            </Field>
            <Field label="Manufacturing date">
              <Input type="date" max={localDate(0)} value={form.manufacturingDate} onChange={set('manufacturingDate')} />
            </Field>
            <Field label="Expiry date" required>
              <Input type="date" min={localDate(1)} required value={form.expiryDate} onChange={set('expiryDate')} />
            </Field>
            <Field label="Purchase price per unit (optional)">
              <Input type="number" min="0" step="0.01" value={form.purchasePrice} onChange={set('purchasePrice')} suffix="Tk" placeholder="0.85" />
            </Field>
            {current && (
              <Notice tone="teal" className="sm:col-span-2">
                After saving, available stock becomes <b>{current.availableStock + qty} units</b> (non-expired batches only).
                <br />Last updated time shown to customers will be set to now.
              </Notice>
            )}
            <ErrorBox error={saveError} className="sm:col-span-2" />
            <div className="flex gap-3 sm:col-span-2">
              <Button type="button" variant="secondary" onClick={() => navigate('/owner/stock')}>Cancel</Button>
              <Button type="submit" loading={saving}>Save batch</Button>
            </div>
          </form>
        </Card>
        <Card title="How stock is counted" className="h-fit">
          <ol className="space-y-4">
            {RULES.map(([title, text], i) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">{i + 1}</span>
                <span><span className="block text-sm font-semibold">{title}</span><span className="text-sm text-slate-500">{text}</span></span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
