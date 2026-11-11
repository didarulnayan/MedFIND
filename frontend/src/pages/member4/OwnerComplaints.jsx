// Member 4 - Feature 2: Owner - respond to complaint (F2-03)
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import OwnerGate from '../../components/OwnerGate';
import { Button, Card, EmptyState, ErrorBox, Field, Loading, Notice, PageHeader, StatusBadge, Textarea, cx } from '../../components/ui';
import { Evidence } from './MyComplaints';

export default function OwnerComplaints() {
  const { data, error, loading, reload } = useApi('/owner/complaints', { limit: 50 });
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sent, setSent] = useState(false);

  const selected = data && (data.complaints.find((c) => c.id === selectedId) || data.complaints[0]);
  useEffect(() => { setMessage(''); setSendError(null); setSent(false); }, [selectedId]);

  async function send(e) {
    e.preventDefault();
    setBusy(true);
    setSendError(null);
    try {
      await api(`/owner/complaints/${selected.id}/response`, { method: 'PATCH', body: { message: message.trim() } });
      setSent(true);
      setMessage('');
      reload();
    } catch (err) {
      setSendError(err);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <OwnerGate error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  const closed = selected && ['Resolved', 'Dismissed'].includes(selected.status);

  return (
    <>
      <PageHeader title="Complaints about your pharmacy" subtitle="Respond to patient complaints. Admins review them and may suspend pharmacies after repeated valid complaints." />
      {data.complaints.length === 0 ? <EmptyState icon="🎉" title="No complaints">Patients have not filed any complaints about your pharmacy.</EmptyState> : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card title="Complaints">
            <ul className="-mx-2 space-y-1">
              {data.complaints.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setSelectedId(c.id)}
                    className={cx('w-full rounded-lg px-3 py-2.5 text-left', selected && selected.id === c.id ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-slate-50')}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">#{c.code}</span>
                      <StatusBadge status={c.status} />
                    </span>
                    <span className="block text-sm text-slate-500">{c.issueType}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          {selected && (
            <Card title={`#${selected.code} ${selected.issueType}`} action={<StatusBadge status={selected.status} />}>
              <p className="text-sm text-slate-500">From {selected.from}{selected.reservation ? ` about reservation #${selected.reservation}` : ''}</p>
              <p className="mt-3">{selected.description}</p>
              <p className="mb-2 mt-5 text-sm font-semibold">Evidence</p>
              <Evidence urls={selected.evidence} />
              <form onSubmit={send} className="mt-6 space-y-3">
                <Field label={selected.responded ? 'Your response (sending again replaces it)' : 'Your response'}>
                  <Textarea required minLength={5} maxLength={2000} disabled={closed} value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="Our stock was updated late because a shipment arrived that morning. We apologise and have fixed our update routine." />
                </Field>
                {closed && <p className="text-sm text-slate-500">This complaint is closed; responses are no longer accepted.</p>}
                <ErrorBox error={sendError} />
                {sent && <Notice tone="green">Response sent. The patient has been notified.</Notice>}
                <div className="flex gap-3">
                  <Button type="submit" loading={busy} disabled={closed || message.trim().length < 5}>Send response</Button>
                  <Button type="button" variant="secondary" onClick={() => setMessage('')}>Cancel</Button>
                </div>
              </form>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
