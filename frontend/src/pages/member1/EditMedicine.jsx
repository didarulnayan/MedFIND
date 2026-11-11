// Member 1 - Feature 1: Edit catalog medicine (F1-03)
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { taka } from '../../lib/format';
import OwnerGate from '../../components/OwnerGate';
import { Button, Card, ErrorBox, Field, InfoRows, Input, Loading, PageHeader, StatusBadge } from '../../components/ui';

function previewStatus(stock, min) {
  if (stock <= 0) return 'Out of stock';
  if (stock <= min) return 'Low stock';
  return 'In stock';
}

export default function EditMedicine() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi(`/owner/catalog/${id}`);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (data) setForm({ price: String(data.price), stockQuantity: String(data.stockQuantity), minStockLevel: String(data.minStockLevel) });
  }, [data]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const body = {};
    if (Number(form.price) !== data.price) body.price = Number(form.price);
    if (Number(form.stockQuantity) !== data.stockQuantity) body.stockQuantity = Number(form.stockQuantity);
    if (Number(form.minStockLevel) !== data.minStockLevel) body.minStockLevel = Number(form.minStockLevel);
    if (Object.keys(body).length === 0) {
      navigate('/owner/catalog');
      return;
    }
    try {
      await api(`/owner/catalog/${id}`, { method: 'PATCH', body });
      navigate('/owner/catalog');
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  if (error) return <OwnerGate error={error} onRetry={reload} />;
  if (loading || !form) return <Loading />;
  const m = data.medicine;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'Medicine Catalog', to: '/owner/catalog' }, { label: `${m.brandName} ${m.strength}` }, { label: 'Edit' }]}
        title="Edit medicine"
        subtitle="Update your price or stock. Customers see the new last-updated time."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Medicine details (from master list)">
          <p className="text-lg font-bold">{m.brandName}</p>
          <p className="mb-2 text-slate-500">{m.genericName}</p>
          <InfoRows rows={[['Manufacturer', m.manufacturer], ['Strength', m.strength], ['Dosage form', m.dosageForm]]} />
          <p className="mt-3 text-xs text-slate-500">These fields come from the master list and cannot be edited.</p>
        </Card>
        <Card title="Your catalog settings">
          <form onSubmit={submit} className="space-y-4">
            <Field label="Selling price" required>
              <Input type="number" step="0.01" min="0.01" required value={form.price} onChange={set('price')} suffix="Tk" />
            </Field>
            <Field label="Stock quantity" required hint="Increases are added as an adjustment batch; decreases use the earliest-expiring batch first.">
              <Input type="number" min="0" step="1" required value={form.stockQuantity} onChange={set('stockQuantity')} suffix="units" />
            </Field>
            <Field label="Minimum stock level">
              <Input type="number" min="0" step="1" value={form.minStockLevel} onChange={set('minStockLevel')} suffix="units" />
            </Field>
            <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm">
              <p className="mb-1 font-semibold text-brand-800">Customers will see</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold">{taka(Number(form.price || 0))} per unit</span>
                <StatusBadge status={previewStatus(Number(form.stockQuantity), Number(form.minStockLevel))} />
                <span className="text-slate-500">Updated just now</span>
              </div>
            </div>
            <ErrorBox error={saveError} />
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => navigate('/owner/catalog')}>Cancel</Button>
              <Button type="submit" loading={saving}>Save changes</Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
