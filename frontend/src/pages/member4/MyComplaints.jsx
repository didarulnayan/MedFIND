// Member 4 - Feature 2: My complaints (F2-02) and complaint detail for the patient
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../../lib/useApi';
import { dateTime } from '../../lib/format';
import { Card, Chips, EmptyState, ErrorBox, LinkButton, Loading, Notice, PageHeader, Pagination, StatusBadge } from '../../components/ui';

export default function MyComplaints() {
  const [query, setQuery] = useState({ tab: 'all', page: 1, limit: 10 });
  const { data, error, loading, reload } = useApi('/complaints/my', query);
  const c = data && data.counts;
  return (
    <>
      <PageHeader title="My complaints" subtitle="Follow the status of each complaint." actions={<LinkButton to="/complaints/new">+ New complaint</LinkButton>} />
      <div className="mb-5">
        <Chips value={query.tab} onChange={(tab) => setQuery({ ...query, tab, page: 1 })} options={[
          { value: 'all', label: 'All', count: c && c.all },
          { value: 'open', label: 'Open', count: c && c.open },
          { value: 'under_review', label: 'Under review', count: c && c.underReview },
          { value: 'closed', label: 'Closed', count: c && c.closed },
        ]} />
      </div>
      {error ? <ErrorBox error={error} onRetry={reload} /> : loading && !data ? <Loading /> : data.complaints.length === 0 ? (
        <EmptyState icon="📝" title="No complaints here" />
      ) : (
        <>
          <div className="space-y-3">
            {data.complaints.map((x) => (
              <Link key={x.id} to={`/complaints/${x.id}`} className="block rounded-xl border border-slate-200 bg-white p-5 hover:border-brand-500">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">#{x.code} {x.issueType}</p>
                    <p className="text-sm text-slate-500">{x.pharmacy}{x.reservation ? ` · reservation #${x.reservation}` : ''}</p>
                  </div>
                  <StatusBadge status={x.status} />
                </div>
                <p className="mt-2 text-sm text-slate-600">{x.latestUpdate}</p>
              </Link>
            ))}
          </div>
          <Pagination pagination={data.pagination} onPage={(page) => setQuery({ ...query, page })} />
        </>
      )}
    </>
  );
}

export function ComplaintHistory({ history }) {
  const label = { filed: 'Complaint filed', pharmacy_response: 'Pharmacy responded', status_change: 'Status changed' };
  return (
    <ol className="space-y-3">
      {history.map((h, i) => (
        <li key={i} className="flex items-start justify-between gap-3 text-sm">
          <span>
            <span className="font-medium">{label[h.action] || h.action}</span>
            {h.statusLabel && <span className="ml-2"><StatusBadge status={h.status} /></span>}
            {h.note && <span className="block text-slate-500">{h.note}</span>}
          </span>
          <span className="shrink-0 text-slate-500">{dateTime(h.at)}</span>
        </li>
      ))}
    </ol>
  );
}

export function Evidence({ urls }) {
  if (!urls || urls.length === 0) return <p className="text-sm text-slate-500">No evidence attached.</p>;
  return (
    <div className="flex flex-wrap gap-3">
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noreferrer"><img src={u} alt="Evidence" className="h-24 w-32 rounded-lg border border-slate-200 object-cover" /></a>
      ))}
    </div>
  );
}

export function ComplaintDetail() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/complaints/${id}`);
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !data) return <Loading />;
  return (
    <>
      <PageHeader crumbs={[{ label: 'My complaints', to: '/complaints' }, { label: `#${data.code}` }]} title={`Complaint #${data.code}`} badge={<StatusBadge status={data.status} />} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={data.issueType}>
          <p className="text-sm text-slate-500">{data.pharmacy}{data.reservation ? ` · reservation #${data.reservation}` : ''}</p>
          <p className="mt-3">{data.description}</p>
          <p className="mb-2 mt-5 text-sm font-semibold">Evidence</p>
          <Evidence urls={data.evidence} />
        </Card>
        <div className="space-y-6">
          <Card title="Pharmacy response">
            {data.pharmacyResponse ? <p>{data.pharmacyResponse.message}</p> : <p className="text-sm text-slate-500">Waiting for the pharmacy to respond.</p>}
          </Card>
          {data.resolutionNote && <Notice tone={data.status === 'Resolved' ? 'green' : 'blue'} title={`Admin decision: ${data.statusLabel}`}>{data.resolutionNote}</Notice>}
          <Card title="History"><ComplaintHistory history={data.history} /></Card>
        </div>
      </div>
    </>
  );
}
