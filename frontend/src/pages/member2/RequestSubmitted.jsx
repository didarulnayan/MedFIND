// Member 2 - Feature 1: Request submitted confirmation (F1-03)
import { useParams } from 'react-router-dom';
import { useApi } from '../../lib/useApi';
import { fullDateTime } from '../../lib/format';
import { ErrorBox, InfoRows, LinkButton, Loading, StatusBadge } from '../../components/ui';

export default function RequestSubmitted() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/reservations/${id}`);
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading || !data) return <Loading />;
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-3xl text-brand-700">✓</div>
      <h1 className="text-2xl font-extrabold">Request sent</h1>
      <p className="mt-1 text-slate-500">{data.pharmacy} will confirm your reservation soon.</p>
      <div className="mt-6 text-left">
        <InfoRows rows={[
          ['Reservation ID', `#${data.code}`],
          ['Medicine', data.medicine],
          ['Pharmacy', data.pharmacyDetails.address ? `${data.pharmacy}, ${data.pharmacyDetails.address}` : data.pharmacy],
          ['Pickup', fullDateTime(data.pickupAt)],
          ['Status', <StatusBadge key="s" status={data.status} />],
        ]} />
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <LinkButton to="/reservations">View my reservations</LinkButton>
        <LinkButton to="/medicines" variant="secondary">Back to medicines</LinkButton>
      </div>
    </div>
  );
}
