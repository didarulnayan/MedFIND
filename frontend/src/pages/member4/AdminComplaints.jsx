// Member 4 - Feature 2: Admin - complaints list (F2-04) and complaint review (F2-05)
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { Button, Card, Chips, EmptyState, ErrorBox, Field, LinkButton, Loading, Modal, Notice, PageHeader, Pagination, Select, StatCard, StatusBadge, Table, Textarea } from '../../components/ui';
import { ComplaintHistory, Evidence } from './MyComplaints';

export default function AdminComplaints() {
  const [query, setQuery] = useState({ status: 'Open', page: 1, limit: 10 });
  const { data, error, loading, reload } = useApi('/admin/complaints', query);
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const c = data && data.counts;
  return (
    <>
      <PageHeader title="Complaints" subtitle="Review complaints and update their status." />
      {c && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Open" value={c.open} tone="amber" />
          <StatCard label="Under review" value={c.underReview} />
          <StatCard label="Resolved" value={c.resolved} tone="teal" />
          <StatCard label="Dismissed" value={c.dismissed} />
        </div>
      )}
      <div className="mb-5">
        <Chips value={query.status} onChange={(status) => setQuery({ ...query, status, page: 1 })} options={[
          { value: 'Open', label: 'Open', count: c && c.open },
          { value: 'UnderReview', label: 'Under review', count: c && c.underReview },
          { value: 'Resolved', label: 'Resolved' },
          { value: 'Dismissed', label: 'Dismissed' },
        ]} />
      </div>
      {loading && !data ? <Loading /> : data.complaints.length === 0 ? <EmptyState icon="✅" title="No complaints in this list" /> : (
        <>
          <Table head={['ID', 'Pharmacy', 'Issue', 'Filed by', 'Status', 'Action']}>
            {data.complaints.map((x) => (
              <tr key={x.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5 font-semibold">#{x.code}</td>
                <td className="px-5 py-3.5">{x.pharmacy}</td>
                <td className="px-5 py-3.5">{x.issueType}</td>
                <td className="px-5 py-3.5">{x.filedBy}</td>
                <td className="px-5 py-3.5"><StatusBadge status={x.status} /></td>
                <td className="px-5 py-3.5"><LinkButton size="sm" variant="secondary" to={`/admin/complaints/${x.id}`}>Review</LinkButton></td>
              </tr>
            ))}
          </Table>
          <Pagination pagination={data.pagination} onPage={(page) => setQuery({ ...query, page })} />
        </>
      )}
    </>
  );
}

const NEXT = { Open: ['UnderReview', 'Resolved', 'Dismissed'], UnderReview: ['Resolved', 'Dismissed'], Resolved: [], Dismissed: [] };
const LABEL = { UnderReview: 'Under Review', Resolved: 'Resolved', Dismissed: 'Dismissed' };

export function AdminComplaintReview() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/complaints/${id}`);
  const { data: pharmacy, reload: reloadPharmacy } = useApi(data ? `/admin/pharmacies/${data.pharmacyId}` : null);
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (data) { setStatus(NEXT[data.status][0] || ''); setNote(data.resolutionNote || ''); }
  }, [data]);

  async function run(fn) {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      reload();
      reloadPharmacy();
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  const saveStatus = (s) => run(() => api(`/admin/complaints/${id}/status`, { method: 'PATCH', body: { status: s, ...(note.trim() ? { resolutionNote: note.trim() } : {}) } }));
  const suspend = () => run(async () => { await api(`/admin/pharmacies/${data.pharmacyId}/suspend`, { method: 'PATCH', body: { reason: reason.trim() } }); setSuspendOpen(false); });
  const reinstate = () => run(() => api(`/admin/pharmacies/${data.pharmacyId}/reinstate`, { method: 'PATCH', body: { note: 'Reinstated by admin' } }));

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  const rec = data.pharmacyRecord;
  const options = NEXT[data.status];

  return (
    <>
      <PageHeader crumbs={[{ label: 'Complaints', to: '/admin/complaints' }, { label: `#${data.code}` }]} title={`Complaint #${data.code}`} badge={<StatusBadge status={data.status} />} />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card title="Patient complaint">
            <p className="font-semibold">{data.pharmacy}</p>
            <p className="text-sm text-slate-500">{data.issueType} · filed by {data.filedBy}{data.reservation ? ` · reservation #${data.reservation}` : ''}</p>
            <p className="mt-3">{data.description}</p>
            <p className="mb-2 mt-5 text-sm font-semibold">Evidence</p>
            <Evidence urls={data.evidence} />
          </Card>
          <Card title="Pharmacy response">
            {data.pharmacyResponse ? <p>{data.pharmacyResponse.message}</p> : <p className="text-sm text-slate-500">No response yet. The pharmacy owner has been notified.</p>}
          </Card>
          <Card title="History"><ComplaintHistory history={data.history} /></Card>
        </div>
        <div className="space-y-6">
          <Card title="Update status">
            {options.length === 0 ? <p className="text-sm text-slate-500">This complaint is {data.statusLabel}. Final states cannot be changed.</p> : (
              <div className="space-y-4">
                <Field label="Status">
                  <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                    {options.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
                  </Select>
                </Field>
                <Field label="Resolution note" hint="Visible to patient and pharmacy. Required to resolve or dismiss.">
                  <Textarea maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
                <div className="flex flex-wrap gap-3">
                  {options.includes('Dismissed') && <Button variant="secondary" loading={busy && status === 'Dismissed'} disabled={!note.trim()} onClick={() => saveStatus('Dismissed')}>Dismiss</Button>}
                  <Button loading={busy} disabled={!status || (status !== 'UnderReview' && !note.trim())} onClick={() => saveStatus(status)}>Save status</Button>
                </div>
              </div>
            )}
            {data.resolutionNote && options.length === 0 && <Notice tone="blue" className="mt-4">{data.resolutionNote}</Notice>}
            <ErrorBox error={actionError} className="mt-4" />
          </Card>
          {rec && (
            <Card title="Pharmacy record">
              <p className="text-sm text-slate-500">Valid complaints in the last 30 days</p>
              <p className="text-4xl font-extrabold">{rec.validComplaintsLast30Days}</p>
              <p className="mt-1 text-sm text-slate-500">Repeated valid complaints ({rec.suspensionThreshold}+) can lead to suspension.</p>
              {pharmacy && pharmacy.isSuspended ? (
                <>
                  <Notice tone="red" className="mt-4">This pharmacy is suspended and hidden from search.</Notice>
                  <Button variant="secondary" className="mt-3" loading={busy} onClick={reinstate}>Reinstate pharmacy</Button>
                </>
              ) : (
                <Button variant="dangerSolid" className="mt-4" disabled={!rec.canSuspend} onClick={() => { setActionError(null); setSuspendOpen(true); }}>Suspend pharmacy</Button>
              )}
              {!rec.canSuspend && !(pharmacy && pharmacy.isSuspended) && <p className="mt-2 text-xs text-slate-500">Not enough valid complaints to suspend.</p>}
            </Card>
          )}
        </div>
      </div>
      <Modal open={suspendOpen} title={`Suspend ${data.pharmacy}?`} onClose={() => setSuspendOpen(false)}
        footer={<><Button variant="secondary" onClick={() => setSuspendOpen(false)}>Cancel</Button><Button variant="dangerSolid" loading={busy} disabled={reason.trim().length < 5} onClick={suspend}>Suspend pharmacy</Button></>}>
        <p className="mb-3 text-sm text-slate-600">The pharmacy will disappear from search and stop receiving reservations until reinstated.</p>
        <Field label="Reason" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Three upheld complaints in 30 days" /></Field>
        <ErrorBox error={actionError} className="mt-3" />
      </Modal>
    </>
  );
}
