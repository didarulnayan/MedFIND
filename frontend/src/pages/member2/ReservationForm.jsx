// Member 2 - Feature 1: Reservation request form (F1-02)
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { localDate, taka, timeAgo } from '../../lib/format';
import { Breadcrumbs, Button, Card, ErrorBox, Field, FileInput, InfoRows, Input, Loading, Notice, Textarea } from '../../components/ui';

export default function ReservationForm() {
  const { id, pharmacyId } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const { data, error, reload } = useApi(`/medicines/${id}/pharmacies/${pharmacyId}/availability`, { quantity });
  const [form, setForm] = useState({ pickupDate: localDate(1), pickupTime: '18:00', note: '' });
  const [prescription, setPrescription] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const fd = new FormData();
    fd.append('medicineId', id);
    fd.append('pharmacyId', pharmacyId);
    fd.append('quantity', String(quantity));
    fd.append('pickupDate', form.pickupDate);
    fd.append('pickupTime', form.pickupTime);
    if (form.note.trim()) fd.append('note', form.note.trim());
    if (prescription) fd.append('prescription', prescription);
    try {
      const res = await api('/reservations', { method: 'POST', form: fd });
      navigate(`/reservations/${res.reservation.id}/submitted`);
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <Loading />;
  const m = data.medicine;
  const max = Math.max(1, Math.min(500, data.reservableQuantity));
  const changeQty = (n) => setQuantity(Math.min(max, Math.max(1, n)));

  return (
    <>
      <Breadcrumbs items={[{ label: 'Medicines', to: '/medicines' }, { label: m.brandName, to: `/medicines/${id}` }, { label: 'Reserve' }]} />
      <h1 className="text-3xl font-extrabold tracking-tight">Reservation request</h1>
      <p className="mb-6 mt-1 text-slate-500">The pharmacy will confirm availability before you collect.</p>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
            <Field label="Quantity" required className="sm:col-span-2" hint={`Up to ${data.reservableQuantity} can be reserved right now.`}>
              <div className="flex w-48 items-center">
                <Button type="button" variant="secondary" onClick={() => changeQty(quantity - 1)} aria-label="Decrease">-</Button>
                <Input type="number" min="1" max={max} value={quantity} onChange={(e) => changeQty(Number(e.target.value) || 1)} className="mx-2 text-center" />
                <Button type="button" variant="secondary" onClick={() => changeQty(quantity + 1)} aria-label="Increase">+</Button>
              </div>
            </Field>
            <Field label="Preferred pickup date" required>
              <Input type="date" required min={localDate(0)} max={localDate(data.pickupRules.maxDaysAhead)} value={form.pickupDate} onChange={(e) => setForm({ ...form, pickupDate: e.target.value })} />
            </Field>
            <Field label="Preferred pickup time" required hint={data.pickupRules.openingHours ? `Opening hours: ${data.pickupRules.openingHours}` : undefined}>
              <Input type="time" required value={form.pickupTime} onChange={(e) => setForm({ ...form, pickupTime: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <FileInput
                label={`Prescription image (${data.prescriptionRequired ? 'required' : 'optional'} for this medicine)`}
                hint="Required for prescription-only medicines."
                file={prescription}
                onChange={setPrescription}
              />
            </div>
            <Field label="Note to pharmacy (optional)" className="sm:col-span-2">
              <Textarea maxLength={500} placeholder="e.g. I need the 500 mg strip only" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </Field>
            <Notice tone="teal" className="sm:col-span-2">
              Your request will show as <b>Pending</b> until the pharmacy confirms availability.<br />
              You can cancel any time before it is Ready for pickup.
            </Notice>
            <ErrorBox error={saveError} className="sm:col-span-2" />
            <div className="flex gap-3 sm:col-span-2">
              <Button type="button" variant="secondary" onClick={() => navigate(`/medicines/${id}`)}>Back</Button>
              <Button type="submit" loading={saving} disabled={!data.canReserve || (data.prescriptionRequired && !prescription)}>Send reservation request</Button>
            </div>
          </form>
        </Card>
        <Card title="Request summary" className="h-fit">
          <p className="font-bold">{m.brandName} {m.strength}</p>
          <p className="mb-2 text-sm text-slate-500">{m.dosageForm} · {m.manufacturer}</p>
          <InfoRows rows={[
            ['Pharmacy', `${data.pharmacy.name}, ${data.pharmacy.area}`],
            ['Price per unit', taka(data.pricePerUnit)],
            ['Quantity', quantity],
            ['Reported stock', `${data.reportedStock} (updated ${timeAgo(data.lastUpdatedAt)})`],
            ['Estimated total', <span key="t" className="text-lg font-extrabold">{taka(data.pricePerUnit * quantity)}</span>],
          ]} />
          <p className="mt-2 text-xs text-slate-500">{data.note}</p>
        </Card>
      </div>
    </>
  );
}
