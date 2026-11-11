// Member 4 - Feature 2: File a complaint (F2-01)
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { Button, Card, ErrorBox, Field, FileInput, Loading, PageHeader, Select, Textarea, cx } from '../../components/ui';

const ISSUES = ['Medicine listed but unavailable', 'Overcharging', 'Rude behaviour', 'Reservation not honoured', 'Expired or damaged medicine', 'Other'];
const NEXT = [
  ['Pharmacy responds', 'The owner can reply to your complaint'],
  ['Admin reviews', 'Status: Open > Under Review'],
  ['Decision', 'Resolved or Dismissed'],
];

export default function FileComplaint() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data, error, loading, reload } = useApi('/reservations/my', { tab: 'all', limit: 50 });
  const [form, setForm] = useState({ targetType: 'reservation', reservationId: params.get('reservation') || '', pharmacyId: '', issueType: ISSUES[0], description: '' });
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const pharmacies = useMemo(() => {
    const map = new Map();
    for (const r of (data && data.reservations) || []) map.set(String(r.pharmacyId), r.pharmacy);
    return [...map.entries()];
  }, [data]);

  useEffect(() => {
    if (!data) return;
    setForm((f) => ({
      ...f,
      reservationId: f.reservationId || (data.reservations[0] ? data.reservations[0].id : ''),
      pharmacyId: f.pharmacyId || (pharmacies[0] ? pharmacies[0][0] : ''),
    }));
  }, [data, pharmacies]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    const fd = new FormData();
    fd.append('targetType', form.targetType);
    if (form.targetType === 'reservation') fd.append('reservationId', form.reservationId);
    else fd.append('pharmacyId', form.pharmacyId);
    fd.append('issueType', form.issueType);
    fd.append('description', form.description.trim());
    files.slice(0, 3).forEach((f) => fd.append('evidence', f));
    try {
      const c = await api('/complaints', { method: 'POST', form: fd });
      navigate(`/complaints/${c.id}`);
    } catch (err) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  const none = data.reservations.length === 0;

  return (
    <>
      <PageHeader title="File a complaint" subtitle="Tell us what went wrong. The pharmacy can respond and an admin will review it." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <p className="mb-1.5 text-sm font-semibold text-slate-700">Complaint is about</p>
              <div className="grid grid-cols-2 gap-3">
                {[['pharmacy', 'A pharmacy'], ['reservation', 'A specific reservation']].map(([v, label]) => (
                  <label key={v} className={cx('flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium', form.targetType === v ? 'border-brand-500 bg-brand-50' : 'border-slate-200')}>
                    <input type="radio" name="target" className="accent-[#0f6e63]" checked={form.targetType === v} onChange={() => setForm({ ...form, targetType: v })} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            {none ? (
              <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">You can file a complaint after you have made a reservation.</p>
            ) : form.targetType === 'reservation' ? (
              <Field label="Reservation" required>
                <Select required value={form.reservationId} onChange={(e) => setForm({ ...form, reservationId: e.target.value })}>
                  {data.reservations.map((r) => <option key={r.id} value={r.id}>#{r.code} {r.medicine} ({r.pharmacy}) - {r.status}</option>)}
                </Select>
              </Field>
            ) : (
              <Field label="Pharmacy" required>
                <Select required value={form.pharmacyId} onChange={(e) => setForm({ ...form, pharmacyId: e.target.value })}>
                  {pharmacies.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Issue type" required>
              <Select value={form.issueType} onChange={(e) => setForm({ ...form, issueType: e.target.value })}>
                {ISSUES.map((i) => <option key={i}>{i}</option>)}
              </Select>
            </Field>
            <Field label="Describe the problem" required hint="At least 10 characters.">
              <Textarea required minLength={10} maxLength={2000} placeholder="The app showed 60 bottles in stock, but the pharmacy said it was sold out when I arrived." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <FileInput label="Evidence (optional, up to 3 images)" hint="Photos of receipts or the listing." multiple file={files.length ? files : null} onChange={(f) => setFiles(f.slice(0, 3))} />
            <ErrorBox error={saveError} />
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" loading={saving} disabled={none}>Submit complaint</Button>
            </div>
          </form>
        </Card>
        <Card title="What happens next" className="h-fit">
          <ol className="space-y-4">
            {NEXT.map(([title, text], i) => (
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
