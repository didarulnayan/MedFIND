// Member 4 - Feature 1: Admin - verify pharmacy (F1-02)
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { dateTime } from '../../lib/format';
import { Button, Card, ErrorBox, Field, InfoRows, LinkButton, Loading, Notice, PageHeader, StatusBadge, Textarea, cx } from '../../components/ui';

const CHECKS = [
  ['tradeLicenceMatches', 'Trade licence number matches records'],
  ['drugLicenceValid', 'Drug licence number is valid'],
  ['contactComplete', 'Address and contact are complete'],
  ['noDuplicate', 'No duplicate pharmacy found'],
];
const DECISIONS = [
  ['Pending', 'Pending'],
  ['Verified', 'Verified (show badge, appear in search)'],
  ['Rejected', 'Rejected'],
];

export default function AdminVerifyPharmacy() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/admin/pharmacies/${id}`);
  const [checklist, setChecklist] = useState({});
  const [decision, setDecision] = useState('Pending');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    if (!data) return;
    setChecklist({
      ...data.checklist,
      contactComplete: data.checklist.contactComplete || data.automatedChecks.contactComplete,
      noDuplicate: data.checklist.noDuplicate || data.automatedChecks.noDuplicate,
    });
    setDecision(data.status);
    setNote(data.note || '');
  }, [data]);

  async function save(status) {
    setBusy(true);
    setSaveError(null);
    setSaved('');
    try {
      await api(`/admin/pharmacies/${id}/verification`, { method: 'PATCH', body: { status, ...(note.trim() ? { note: note.trim() } : {}), checklist } });
      setSaved(`Saved: ${status}`);
      reload();
    } catch (err) {
      setSaveError(err);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  const s = data.submitted;
  const allChecked = CHECKS.every(([k]) => checklist[k]);

  return (
    <>
      <PageHeader crumbs={[{ label: 'Pharmacy Verification', to: '/admin/pharmacies' }, { label: data.name }]} title={`Review: ${data.name}`} badge={<StatusBadge status={data.isSuspended ? 'Suspended' : data.status} />} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Submitted details">
          <InfoRows rows={[
            ['Owner', s.owner], ['Phone', s.phone], ['Email', s.email],
            ['Trade licence no.', s.tradeLicenceNo], ['Drug licence no.', s.drugLicenceNo],
            ['Address', s.address], ['Opening hours', s.openingHours], ['Submitted', dateTime(s.submittedAt)],
          ]} />
          {s.licenceDocumentUrl ? (
            <a href={s.licenceDocumentUrl} target="_blank" rel="noreferrer"><img src={s.licenceDocumentUrl} alt="Licence document" className="mt-4 max-h-56 rounded-lg border border-slate-200" /></a>
          ) : <p className="mt-4 text-sm text-slate-500">No licence document uploaded.</p>}
          {data.automatedChecks.possibleDuplicates.length > 0 && (
            <Notice tone="red" className="mt-4" title="Possible duplicates">
              {data.automatedChecks.possibleDuplicates.map((d) => `${d.name} (${d.address.area}, ${d.phone})`).join('; ')}
            </Notice>
          )}
        </Card>
        <div className="space-y-6">
          <Card title="Checklist">
            <div className="space-y-2.5">
              {CHECKS.map(([k, label]) => (
                <label key={k} className="flex cursor-pointer items-center gap-3 text-sm">
                  <input type="checkbox" className="h-4 w-4 accent-[#0f6e63]" checked={Boolean(checklist[k])} onChange={(e) => setChecklist({ ...checklist, [k]: e.target.checked })} />
                  {label}
                </label>
              ))}
            </div>
          </Card>
          <Card title="Decision">
            <div className="space-y-2">
              {DECISIONS.map(([v, label]) => (
                <label key={v} className={cx('flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 text-sm', decision === v ? 'border-brand-500 bg-brand-50' : 'border-slate-200')}>
                  <input type="radio" name="decision" className="accent-[#0f6e63]" checked={decision === v} onChange={() => setDecision(v)} />
                  {label}
                </label>
              ))}
            </div>
            <Field label="Note to owner (required if rejected)" className="mt-4">
              <Textarea maxLength={500} placeholder="Reason for the decision" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            {decision === 'Verified' && !allChecked && <p className="mt-2 text-sm text-amber-700">Tick every checklist item before verifying.</p>}
            <ErrorBox error={saveError} className="mt-4" />
            {saved && <Notice tone="green" className="mt-4">{saved}</Notice>}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="danger" loading={busy && decision === 'Rejected'} disabled={!note.trim() || data.status === 'Rejected'} onClick={() => save('Rejected')}>Reject</Button>
              <Button loading={busy && decision !== 'Rejected'} disabled={!allChecked || data.status === 'Verified'} onClick={() => save('Verified')}>Verify pharmacy</Button>
              {decision === 'Pending' && data.status !== 'Pending' && <Button variant="secondary" onClick={() => save('Pending')}>Move back to Pending</Button>}
            </div>
          </Card>
          <LinkButton to="/admin/pharmacies" variant="secondary">Back to list</LinkButton>
        </div>
      </div>
    </>
  );
}
