// Member 3 - Feature 2: Nearby pharmacies & sorting (F2-01), Choose location (F2-02), No pharmacies nearby (F2-03)
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { taka, timeAgo } from '../../lib/format';
import MedicineSearchBox from '../../components/MedicineSearchBox';
import { Badge, Button, Chips, EmptyState, ErrorBox, Field, LinkButton, Loading, Modal, Select, Stars, StatusBadge, Toggle, VerifiedBadge, cx } from '../../components/ui';

const DEFAULT_AREA = 'Mirpur 10';

function ChooseLocation({ open, onClose, onApply, areas, current }) {
  const [mode, setMode] = useState(current.areaId ? 'area' : 'gps');
  const [city, setCity] = useState('Dhaka');
  const [areaId, setAreaId] = useState(current.areaId || '');
  const [radius, setRadius] = useState(current.radiusKm);
  const [gps, setGps] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (open) { setAreaId(current.areaId || ''); setRadius(current.radiusKm); setGpsError(''); }
  }, [open, current.areaId, current.radiusKm]);

  const cityAreas = (areas.find((c) => c.name === city) || { areas: [] }).areas;

  function shareLocation() {
    setMode('gps');
    setGpsError('');
    if (!navigator.geolocation) { setGpsError('Your browser cannot share location. Select an area instead.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const r = await api('/locations/resolve', { query: { lat, lng } });
          setGps({ lat, lng, label: r.label });
        } catch {
          setGps({ lat, lng, label: `${lat.toFixed(4)}, ${lng.toFixed(4)}` });
        }
        setLocating(false);
      },
      () => { setLocating(false); setGpsError('Location permission was denied. Select an area instead.'); },
      { timeout: 10000 }
    );
  }

  function apply() {
    if (mode === 'gps' && gps) onApply({ lat: gps.lat, lng: gps.lng, areaId: '', label: gps.label, radiusKm: radius });
    else if (areaId) {
      const a = cityAreas.find((x) => x.id === areaId);
      onApply({ areaId, lat: '', lng: '', label: `${a.name}, ${city}`, radiusKm: radius });
    }
  }

  return (
    <Modal open={open} title="Choose your location" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={apply} disabled={mode === 'gps' ? !gps : !areaId}>Apply</Button></>}>
      <p className="mb-4 text-sm text-slate-500">We use it to show pharmacies near you.</p>
      <Button variant={mode === 'gps' && gps ? 'soft' : 'secondary'} className="w-full" loading={locating} onClick={shareLocation}>
        📍 {gps && mode === 'gps' ? `Using: ${gps.label}` : 'Share my current location'}
      </Button>
      {gpsError && <p className="mt-2 text-sm text-red-600">{gpsError}</p>}
      <p className="my-4 text-center text-sm text-slate-400">or</p>
      <p className="mb-2 text-sm font-semibold">Select an area</p>
      <div className="grid grid-cols-2 gap-3">
        <Select value={city} onChange={(e) => { setCity(e.target.value); setAreaId(''); setMode('area'); }} aria-label="City">
          {areas.map((c) => <option key={c.name}>{c.name}</option>)}
        </Select>
        <Select value={areaId} onChange={(e) => { setAreaId(e.target.value); setMode('area'); }} aria-label="Area">
          <option value="">Choose area</option>
          {cityAreas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </Select>
      </div>
      <p className="mb-2 mt-5 text-sm font-semibold">Search radius</p>
      <Chips value={radius} onChange={setRadius} options={[1, 3, 5, 10, 20].map((r) => ({ value: r, label: `${r} km` }))} />
      <p className="mt-5 text-xs text-slate-500">Your exact location is only used to calculate distance and is not shared with pharmacies.</p>
    </Modal>
  );
}

export default function Nearby() {
  const [params, setParams] = useSearchParams();
  const { data: areaData } = useApi('/locations/areas');
  const [modal, setModal] = useState(false);
  const [changingMedicine, setChangingMedicine] = useState(false);

  const loc = useMemo(() => ({
    areaId: params.get('areaId') || '',
    lat: params.get('lat') || '',
    lng: params.get('lng') || '',
    label: params.get('label') || '',
    radiusKm: Number(params.get('radius')) || 5,
  }), [params]);
  const medicineId = params.get('medicineId') || '';
  const sort = params.get('sort') || 'distance';
  const openNow = params.get('openNow') === 'true';

  // default location: Mirpur 10, Dhaka (as in the design) until the user chooses one
  useEffect(() => {
    if (!loc.areaId && !loc.lat && areaData) {
      const dhaka = areaData.cities.find((c) => c.name === 'Dhaka');
      const a = dhaka && dhaka.areas.find((x) => x.name === DEFAULT_AREA);
      if (a) update({ areaId: a.id, label: `${a.name}, Dhaka` });
    }
  }, [areaData]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(patch) {
    const next = Object.fromEntries(params.entries());
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v === undefined || v === null || v === false) delete next[k];
      else next[k] = String(v);
    }
    setParams(next, { replace: true });
  }

  const ready = Boolean(loc.areaId || (loc.lat && loc.lng));
  const query = ready ? { medicineId, sort, openNow: openNow ? 'true' : undefined, radiusKm: loc.radiusKm, ...(loc.areaId ? { areaId: loc.areaId } : { lat: loc.lat, lng: loc.lng }), limit: 20 } : null;
  const { data, error, loading, reload } = useApi(ready ? '/nearby/pharmacies' : null, query);

  return (
    <>
      <div className="mb-5 grid gap-4 md:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="text-xs text-slate-500">Your location</p>
            <p className="font-bold">{loc.label || 'Not set'}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setModal(true)}>Change</Button>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
          {changingMedicine || !medicineId ? (
            <MedicineSearchBox placeholder="Which medicine do you need?" onPickBrand={(s) => { update({ medicineId: s.id }); setChangingMedicine(false); }} onSubmit={() => {}} />
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">Medicine</p>
                <p className="font-bold">{data && data.medicine ? `${data.medicine.label} (${data.medicine.genericName})` : '...'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setChangingMedicine(true)}>Change medicine</Button>
                <Button variant="ghost" size="sm" onClick={() => update({ medicineId: '' })} aria-label="Clear medicine">✕</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-sm font-semibold">
            Radius
            <Select className="w-auto" value={loc.radiusKm} onChange={(e) => update({ radius: e.target.value })}>
              {[1, 3, 5, 10, 20].map((r) => <option key={r} value={r}>{r} km</option>)}
            </Select>
          </label>
          <div className="w-40"><Toggle checked={openNow} onChange={(v) => update({ openNow: v })} label="Open now" /></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold">Sort by</span>
          <Chips value={sort} onChange={(v) => update({ sort: v })} options={[
            { value: 'distance', label: 'Distance' },
            { value: 'price', label: 'Price' },
            { value: 'rating', label: 'Rating' },
            { value: 'updated', label: 'Recently updated' },
          ]} />
        </div>
      </div>

      {error ? <ErrorBox error={error} onRetry={reload} /> : !ready || !data ? <Loading /> : data.total === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white">
          <EmptyState icon="📍" title={data.emptyState.message}
            actions={<>
              {data.emptyState.suggestions.largerRadiusKm.map((r) => <Button key={r} variant="secondary" onClick={() => update({ radius: r })}>{r} km</Button>)}
              <Button variant="secondary" onClick={() => setModal(true)}>Change location</Button>
              <LinkButton to="/medicines">Search another medicine</LinkButton>
            </>}>
            Try a bigger search radius{data.emptyState.suggestions.turnOffOpenNow ? ', or turn off the "Open now" filter' : ''}. Pharmacies update stock regularly, so check again later.
          </EmptyState>
        </div>
      ) : (
        <>
          <p className="mb-3 font-semibold">{data.summary}</p>
          <div className={cx('space-y-3', loading && 'opacity-60')}>
            {data.pharmacies.map((p) => (
              <div key={p.id} className="grid items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-[1.6fr_0.6fr_1fr_1fr_auto]">
                <div>
                  <Link to={`/pharmacies/${p.id}`} className="text-lg font-bold hover:text-brand-700">{p.name}, {p.area}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    {p.verified && <VerifiedBadge />}
                    <Badge tone={p.openNow ? 'green' : 'gray'}>{p.openNow ? 'Open now' : 'Closed'}</Badge>
                    <Stars value={p.rating} size="text-sm" />
                    <span className="text-slate-500">{p.rating.toFixed(1)} ({p.ratingCount})</span>
                  </div>
                </div>
                <p className="text-lg font-bold text-brand-700">{p.distanceKm} km</p>
                {p.listing ? (
                  <>
                    <div><p className="font-bold">{taka(p.listing.price)} / pc</p><StatusBadge status={p.listing.stockStatus} label={`${p.listing.stockStatus} (${p.listing.stock})`} /></div>
                    <p className="text-sm text-slate-500">Updated {timeAgo(p.listing.lastUpdatedAt)}</p>
                  </>
                ) : <p className="text-sm text-slate-500 md:col-span-2">{p.openingHours}</p>}
                <div className="flex gap-2">
                  <LinkButton to={`/pharmacies/${p.id}`} variant="secondary" size="sm">Details</LinkButton>
                  {p.listing && medicineId && <LinkButton to={`/medicines/${medicineId}/reserve/${p.id}`} size="sm">Reserve</LinkButton>}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-500">Showing results sorted by {sort === 'updated' ? 'most recently updated stock' : sort === 'distance' ? 'distance (nearest first)' : sort}.</p>
        </>
      )}

      {areaData && (
        <ChooseLocation open={modal} onClose={() => setModal(false)} areas={areaData.cities} current={loc}
          onApply={(l) => { update({ areaId: l.areaId, lat: l.lat, lng: l.lng, label: l.label, radius: l.radiusKm }); setModal(false); }} />
      )}
    </>
  );
}
