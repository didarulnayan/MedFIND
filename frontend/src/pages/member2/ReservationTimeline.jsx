// Member 2 - Feature 2: Reservation status timeline (F2-02)
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { dateTime, fullDateTime, taka } from '../../lib/format';
import { Button, Card, ErrorBox, InfoRows, LinkButton, Loading, Modal, Notice, PageHeader, StatusBadge, Textarea, cx } from '../../components/ui';

const WAITING = { Confirmed: 'Waiting for the pharmacy', ReadyForPickup: 'Waiting for the pharmacy', Collected: 'Pick up before the deadline' };

export function Timeline({ timeline }) {
  return (
    <ol className="relative">
      {timeline.steps.map((s, i) => (
        <li key={s.status} className="relative flex gap-4 pb-8 last:pb-0">
          {i < timeline.steps.length - 1 && (
            <span className={cx('absolute left-[13px] top-7 h-full w-0.5', timeline.steps[i + 1].done ? 'bg-brand-700' : 'bg-slate-200')} />
          )}
          <span className={cx('z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm', s.done ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white')}>
            {s.done ? '✓' : ''}
          </span>
          <div>
            <p className={cx('font-semibold', !s.done && 'text-slate-500')}>{s.label}</p>
            <p className="text-sm text-slate-500">{s.done ? `${dateTime(s.at)} - ${s.note || s.label}` : WAITING[s.status]}</p>
          </div>
        </li>
      ))}
      {timeline.terminal && (
        <li className="mt-6 flex gap-4">
          <span className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm text-white">✕</span>
          <div><p className="font-semibold text-red-700">{timeline.terminal.label}</p><p className="text-sm text-slate-500">{dateTime(timeline.terminal.at)}</p></div>
        </li>
      )}
    </ol>
  );
}

export default function ReservationTimeline() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/reservations/${id}`);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  async function cancel() {
    setBusy(true);
    setCancelError(null);
    try {
      await api(`/reservations/${id}/cancel`, { method: 'PATCH', body: reason.trim() ? { reason: reason.trim() } : {} });
      setCancelOpen(false);
      reload();
    } catch (err) {
      setCancelError(err);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  const md = data.medicineDetails;
  const active = ['Pending', 'Confirmed', 'ReadyForPickup'].includes(data.status);

  return (
    <>
      <PageHeader crumbs={[{ label: 'My reservations', to: '/reservations' }, { label: `#${data.code}` }]} title={`Reservation #${data.code}`} badge={<StatusBadge status={data.status} />} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Status timeline">
          <Timeline timeline={data.timeline} />
          {active && (
            <Notice tone="amber" title={`Pickup deadline: ${dateTime(data.pickupDeadline)}`} className="mt-6">
              Confirmed reservations expire automatically if not collected by the deadline.
            </Notice>
          )}
          {data.rejection && data.rejection.reason && (
            <Notice tone="red" title={`Rejected: ${data.rejection.reason}`} className="mt-6">{data.rejection.message || 'No message from the pharmacy.'}</Notice>
          )}
        </Card>
        <div className="space-y-5">
          <Card title="Reservation details">
            <InfoRows rows={[
              ['Medicine', `${md.brandName} (${md.genericName}) ${md.dosageForm} ${md.strength}`],
              ['Quantity', data.quantity],
              ['Pharmacy', `${data.pharmacyDetails.name}, ${data.pharmacyDetails.address}`],
              ['Price', `${taka(data.unitPrice)} / unit (total ${taka(data.totalPrice)})`],
              ['Pickup', fullDateTime(data.pickupAt)],
              data.note && ['Your note', data.note],
              data.prescriptionUrl && ['Prescription', <a key="p" href={data.prescriptionUrl} target="_blank" rel="noreferrer" className="text-brand-700 underline">View image</a>],
            ]} />
          </Card>
          <div className="flex flex-wrap gap-3">
            {data.canCancel && <Button variant="danger" onClick={() => setCancelOpen(true)}>Cancel reservation</Button>}
            <LinkButton to="/reservations" variant="secondary">Back</LinkButton>
            {data.status === 'Collected' && <LinkButton to={`/pharmacies/${data.pharmacyId}/review`} variant="soft">Write a review</LinkButton>}
            <LinkButton to={`/complaints/new?reservation=${data.id}`} variant="ghost">Report a problem</LinkButton>
          </div>
          {data.canCancel && <p className="text-sm text-slate-500">You can cancel until the reservation is Ready for pickup.</p>}
        </div>
      </div>

      <Modal open={cancelOpen} title="Cancel this reservation?" onClose={() => setCancelOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setCancelOpen(false)}>Keep it</Button><Button variant="dangerSolid" loading={busy} onClick={cancel}>Cancel reservation</Button></>}>
        <Textarea placeholder="Reason (optional), e.g. bought it elsewhere" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
        <ErrorBox error={cancelError} className="mt-3" />
      </Modal>
    </>
  );
}
