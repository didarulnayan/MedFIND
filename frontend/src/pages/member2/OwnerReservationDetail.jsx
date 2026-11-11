// Member 2 - Feature 2: Owner reservation detail (F2-04) and reject modal (F2-05)
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { dateTime, fullDateTime, taka } from '../../lib/format';
import OwnerGate from '../../components/OwnerGate';
import { Button, Card, ErrorBox, Field, InfoRows, Loading, Modal, Notice, PageHeader, Select, StatusBadge, Textarea } from '../../components/ui';

const NEXT_LABEL = { Confirmed: 'Confirm availability', ReadyForPickup: 'Mark ready for pickup', Collected: 'Mark as collected' };
const REASONS = ['Out of stock', 'Prescription required', 'Invalid prescription', 'Pharmacy closed at pickup time', 'Other'];

export default function OwnerReservationDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/reservations/${id}`);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reject, setReject] = useState({ reason: 'Out of stock', message: '' });
  const [lastResult, setLastResult] = useState(null);

  async function advance() {
    setBusy(true);
    setActionError(null);
    try {
      const res = await api(`/owner/reservations/${id}/status`, { method: 'PATCH', body: { status: data.nextStatus } });
      setLastResult(res);
      reload();
    } catch (err) {
      setActionError(err);
      reload();
    } finally {
      setBusy(false);
    }
  }

  async function submitReject() {
    setBusy(true);
    setActionError(null);
    try {
      await api(`/owner/reservations/${id}/reject`, { method: 'PATCH', body: { reason: reject.reason, ...(reject.message.trim() ? { message: reject.message.trim() } : {}) } });
      setRejectOpen(false);
      reload();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <OwnerGate error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  const md = data.medicineDetails;
  const canReject = ['Pending', 'Confirmed'].includes(data.status);

  return (
    <>
      <PageHeader crumbs={[{ label: 'Reservations', to: '/owner/reservations' }, { label: `#${data.code}` }]} title={`Reservation #${data.code}`} badge={<StatusBadge status={data.status} />} />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card title="Request details">
          <InfoRows rows={[
            ['Patient', `${data.patient.name}${data.patient.phone ? ` (${data.patient.phone})` : ''}`],
            ['Medicine', `${md.brandName} ${md.strength}, ${md.dosageForm}`],
            ['Quantity', `${data.quantity} (your stock: ${data.yourStock})`],
            ['Price', `${taka(data.unitPrice)} / unit (total ${taka(data.totalPrice)})`],
            ['Pickup', fullDateTime(data.pickupAt)],
            ['Pickup deadline', fullDateTime(data.pickupDeadline)],
            ['Note', data.note || 'No note'],
          ]} />
          <div className="mt-4 rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-semibold">Prescription image</p>
            {data.prescriptionUrl ? (
              <a href={data.prescriptionUrl} target="_blank" rel="noreferrer">
                <img src={data.prescriptionUrl} alt="Prescription uploaded by the patient" className="mt-2 max-h-56 rounded-lg border border-slate-200" />
              </a>
            ) : (
              <p className="mt-1 text-sm text-slate-500">{data.prescriptionRequired ? 'Required but not uploaded yet.' : 'Not required. This medicine does not need a prescription.'}</p>
            )}
          </div>
        </Card>
        <div className="space-y-5">
          <Card title="Update status">
            {data.nextStatus ? (
              <>
                <p className="mb-4 text-sm text-slate-500">Move this reservation to the next step.</p>
                <div className="flex flex-wrap gap-3">
                  <Button loading={busy} onClick={advance}>{NEXT_LABEL[data.nextStatus]}</Button>
                  {canReject && <Button variant="danger" onClick={() => { setActionError(null); setRejectOpen(true); }}>Reject request</Button>}
                </div>
                <p className="mt-4 text-xs text-slate-500">Next steps: Confirmed › Ready for pickup › Collected. Stock reduces automatically when marked Collected.</p>
              </>
            ) : <p className="text-sm text-slate-500">This reservation is {data.statusLabel.toLowerCase()}; no further changes.</p>}
            <ErrorBox error={actionError} className="mt-4" />
            {lastResult && lastResult.consumedBatches && (
              <Notice tone="green" className="mt-4" title="Collected - stock updated">
                Used batches: {lastResult.consumedBatches.map((b) => `${b.batchNumber} (${b.quantity})`).join(', ')}. Remaining stock: {lastResult.remainingStock}.
              </Notice>
            )}
          </Card>
          <Card title="History">
            <ol className="space-y-3">
              {data.history.map((h, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-sm">
                  <span><StatusBadge status={h.status} /> <span className="ml-1 text-slate-600">{h.note}</span></span>
                  <span className="shrink-0 text-slate-500">{dateTime(h.at)}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <Modal open={rejectOpen} title="Reject this request" onClose={() => setRejectOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setRejectOpen(false)}>Cancel</Button><Button variant="dangerSolid" loading={busy} onClick={submitReject}>Reject request</Button></>}>
        <div className="space-y-4">
          <Field label="Reason" required>
            <Select value={reject.reason} onChange={(e) => setReject({ ...reject, reason: e.target.value })}>
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </Select>
          </Field>
          <Field label="Message to patient (optional)">
            <Textarea maxLength={500} placeholder="Sorry, this batch is sold out. New stock arrives on Thursday." value={reject.message} onChange={(e) => setReject({ ...reject, message: e.target.value })} />
          </Field>
          <p className="text-sm text-slate-500">The patient is notified by email and in the app.</p>
          <ErrorBox error={actionError} />
        </div>
      </Modal>
    </>
  );
}
