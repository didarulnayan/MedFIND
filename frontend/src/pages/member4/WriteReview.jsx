// Member 4 - Feature 1: Write a review (F1-04)
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { Button, Card, EmptyState, ErrorBox, Field, LinkButton, Loading, PageHeader, Select, Textarea, cx } from '../../components/ui';

export default function WriteReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: p } = useApi(`/pharmacies/${id}`);
  const { data, error, loading, reload } = useApi(`/pharmacies/${id}/reviewable-reservations`);
  const [form, setForm] = useState({ reservationId: '', rating: 0, text: '' });
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    if (data && data.reservations[0]) setForm((f) => ({ ...f, reservationId: f.reservationId || data.reservations[0].id }));
  }, [data]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await api(`/pharmacies/${id}/reviews`, { method: 'POST', body: { reservationId: form.reservationId, rating: form.rating, ...(form.text.trim() ? { text: form.text.trim() } : {}) } });
      navigate(`/pharmacies/${id}`);
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  const shown = hover || form.rating;
  return (
    <>
      <PageHeader crumbs={[{ label: p ? p.name : 'Pharmacy', to: `/pharmacies/${id}` }, { label: 'Write a review' }]} title="Rate your experience" subtitle={p ? p.address : ''} />
      <Card className="max-w-2xl">
        {error ? <ErrorBox error={error} onRetry={reload} /> : loading ? <Loading /> : data.reservations.length === 0 ? (
          <EmptyState icon="🧾" title="No collected reservation to review" actions={<LinkButton to={`/pharmacies/${id}`} variant="secondary">Back to pharmacy</LinkButton>}>
            Only patients who collected a reservation at this pharmacy can review it, once per reservation.
          </EmptyState>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <Field label="Reservation" required>
              <Select required value={form.reservationId} onChange={(e) => setForm({ ...form, reservationId: e.target.value })}>
                {data.reservations.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </Select>
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-slate-700">Your rating <span className="text-red-600">*</span></p>
              <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" aria-label={`${n} star${n > 1 ? 's' : ''}`} onMouseEnter={() => setHover(n)} onClick={() => setForm({ ...form, rating: n })}
                    className={cx('text-4xl leading-none transition', n <= shown ? 'text-amber-400' : 'text-slate-300')}>★</button>
                ))}
                <span className="ml-3 text-sm text-slate-500">{shown ? `${shown} out of 5 stars` : 'Tap a star'}</span>
              </div>
            </div>
            <Field label="Your review (optional)">
              <Textarea maxLength={1000} placeholder="Stock was exactly as listed and the staff were helpful." value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
            </Field>
            <p className="text-sm text-slate-500">Only collected reservations can be reviewed. Be respectful and honest.</p>
            <ErrorBox error={saveError} />
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => navigate(`/pharmacies/${id}`)}>Cancel</Button>
              <Button type="submit" loading={saving} disabled={!form.rating}>Submit review</Button>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}
