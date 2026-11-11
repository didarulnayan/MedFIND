// Member 4 - Feature 1: Pharmacy profile with reviews (F1-03)
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { timeAgo } from '../../lib/format';
import { Avatar, Badge, Card, EmptyState, ErrorBox, LinkButton, Loading, Pagination, Stars, VerifiedBadge } from '../../components/ui';

export default function PharmacyProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data: p, error, loading, reload } = useApi(`/pharmacies/${id}`);
  const { data: rv } = useApi(`/pharmacies/${id}/reviews`, { page, limit: 5 });

  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (loading && !p) return <Loading />;

  return (
    <>
      <Card className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-3xl">🏥</span>
            <div>
              <h1 className="flex flex-wrap items-center gap-3 text-3xl font-extrabold tracking-tight">{p.name} {p.verifiedBadge && <VerifiedBadge />}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2"><Badge tone={p.openNow ? 'green' : 'gray'}>{p.openNow ? 'Open now' : 'Closed now'}</Badge></div>
              <p className="mt-2 text-slate-600">📍 {p.address}</p>
              <p className="text-slate-600">🕘 {p.openingHours}</p>
              <p className="text-slate-600">📞 {p.phone}</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-5xl font-extrabold">{p.rating.average.toFixed(1)}</p>
            <Stars value={p.rating.average} size="text-xl" />
            <p className="text-sm text-slate-500">({p.rating.count} review{p.rating.count === 1 ? '' : 's'})</p>
            <a className="mt-2 block text-sm text-brand-700 underline" href={`https://www.google.com/maps/dir/?api=1&destination=${p.location.lat},${p.location.lng}`} target="_blank" rel="noreferrer">Directions</a>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-5">
          <Card title="Rating summary">
            <div className="space-y-2">
              {p.rating.distribution.map((d) => (
                <div key={d.stars} className="flex items-center gap-3 text-sm">
                  <span className="w-6">{d.stars}★</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${d.percent}%` }} /></span>
                  <span className="w-10 text-right text-slate-500">{d.percent}%</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            {user && user.role === 'patient'
              ? <LinkButton to={`/pharmacies/${id}/review`} className="w-full">Write a review</LinkButton>
              : <LinkButton to={`/login?next=/pharmacies/${id}/review`} variant="secondary" className="w-full">Log in to write a review</LinkButton>}
            <p className="mt-3 text-center text-xs text-slate-500">{p.reviewPolicy}</p>
          </Card>
        </div>
        <Card title="Reviews" action={<span className="text-sm text-slate-500">Most recent first</span>}>
          {!rv ? <Loading /> : rv.reviews.length === 0 ? <EmptyState icon="⭐" title="No reviews yet" /> : (
            <>
              <ul className="divide-y divide-slate-100">
                {rv.reviews.map((r) => (
                  <li key={r.id} className="flex gap-4 py-4">
                    <Avatar name={r.author} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-semibold">{r.author}</span>
                        <Stars value={r.rating} size="text-sm" />
                        <span className="text-sm text-slate-500">{timeAgo(r.createdAt)}</span>
                      </div>
                      {r.text && <p className="mt-1 text-slate-700">{r.text}</p>}
                      {r.verifiedPurchase && <Badge tone="green" className="mt-2">Verified purchase</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination pagination={rv.pagination} onPage={setPage} />
            </>
          )}
        </Card>
      </div>
    </>
  );
}
