// Member 4 - Feature 1: Pharmacy registration, licence submission and verification status (owner side)
import { useState } from 'react';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { dateTime } from '../../lib/format';
import { Badge, Button, Card, ErrorBox, Field, FileInput, Input, Loading, Notice, PageHeader, StatusBadge, cx } from '../../components/ui';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CHECKS = [
  ['tradeLicenceMatches', 'Trade licence number matches records'],
  ['drugLicenceValid', 'Drug licence number is valid'],
  ['contactComplete', 'Address and contact are complete'],
  ['noDuplicate', 'No duplicate pharmacy found'],
];

function RegisterForm({ onDone }) {
  const [f, setF] = useState({ name: '', phone: '', email: '', addressLine: '', area: '', city: 'Dhaka', lat: '', lng: '', open: '09:00', close: '22:00', days: [0, 1, 2, 3, 4, 6], openingHoursText: '', tradeLicenceNo: '', drugLicenceNo: '' });
  const [doc, setDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function locate() {
    navigator.geolocation && navigator.geolocation.getCurrentPosition((p) => setF((x) => ({ ...x, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const fd = new FormData();
    for (const k of ['name', 'phone', 'email', 'addressLine', 'area', 'city', 'lat', 'lng', 'tradeLicenceNo', 'drugLicenceNo']) fd.append(k, f[k]);
    fd.append('openingHours', JSON.stringify(f.days.map((day) => ({ day, open: f.open, close: f.close }))));
    fd.append('openingHoursText', f.openingHoursText || `${f.days.map((d) => DAYS[d]).join(', ')} ${f.open} - ${f.close}`);
    if (doc) fd.append('licenceDocument', doc);
    try {
      await api('/pharmacies/register', { method: 'POST', form: fd });
      onDone();
    } catch (error) {
      setErr(error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Register your pharmacy">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Pharmacy name" required><Input required value={f.name} onChange={set('name')} /></Field>
        <Field label="Phone" required hint="11 digits, e.g. 01712345678"><Input required pattern="01[0-9]{9}" value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Email" required><Input type="email" required value={f.email} onChange={set('email')} /></Field>
        <Field label="Address (house, road)" required><Input required value={f.addressLine} onChange={set('addressLine')} /></Field>
        <Field label="Area" required><Input required value={f.area} onChange={set('area')} placeholder="Mirpur 10" /></Field>
        <Field label="City" required><Input required value={f.city} onChange={set('city')} /></Field>
        <Field label="Latitude" required><Input type="number" step="any" required value={f.lat} onChange={set('lat')} placeholder="23.8069" /></Field>
        <Field label="Longitude" required><Input type="number" step="any" required value={f.lng} onChange={set('lng')} placeholder="90.3687" /></Field>
        <div className="sm:col-span-2"><Button type="button" variant="secondary" size="sm" onClick={locate}>📍 Use my current location</Button></div>
        <Field label="Opening time" required><Input type="time" required value={f.open} onChange={set('open')} /></Field>
        <Field label="Closing time" required><Input type="time" required value={f.close} onChange={set('close')} /></Field>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-semibold text-slate-700">Open on</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => (
              <button key={d} type="button" onClick={() => setF({ ...f, days: f.days.includes(i) ? f.days.filter((x) => x !== i) : [...f.days, i].sort() })}
                className={cx('rounded-full border px-3 py-1 text-sm', f.days.includes(i) ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300')}>{d}</button>
            ))}
          </div>
        </div>
        <Field label="Trade licence no." required><Input required value={f.tradeLicenceNo} onChange={set('tradeLicenceNo')} placeholder="TRD-2026-000000" /></Field>
        <Field label="Drug licence no." required><Input required value={f.drugLicenceNo} onChange={set('drugLicenceNo')} placeholder="DL-DHK-00000" /></Field>
        <div className="sm:col-span-2"><FileInput label="Licence document (optional)" file={doc} onChange={setDoc} /></div>
        <ErrorBox error={err} className="sm:col-span-2" />
        <div className="sm:col-span-2"><Button type="submit" loading={saving} disabled={f.days.length === 0}>Submit for verification</Button></div>
      </form>
    </Card>
  );
}

function ResubmitForm({ licence, onDone }) {
  const [f, setF] = useState({ tradeLicenceNo: licence.tradeLicenceNo, drugLicenceNo: licence.drugLicenceNo });
  const [doc, setDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    const fd = new FormData();
    fd.append('tradeLicenceNo', f.tradeLicenceNo);
    fd.append('drugLicenceNo', f.drugLicenceNo);
    if (doc) fd.append('licenceDocument', doc);
    try {
      await api('/pharmacies/mine/licence', { method: 'PUT', form: fd });
      onDone();
    } catch (error) {
      setErr(error);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Card title="Update licence details">
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Trade licence no." required><Input required value={f.tradeLicenceNo} onChange={(e) => setF({ ...f, tradeLicenceNo: e.target.value })} /></Field>
        <Field label="Drug licence no." required><Input required value={f.drugLicenceNo} onChange={(e) => setF({ ...f, drugLicenceNo: e.target.value })} /></Field>
        <div className="sm:col-span-2"><FileInput label="Licence document" file={doc} onChange={setDoc} /></div>
        <ErrorBox error={err} className="sm:col-span-2" />
        <div className="sm:col-span-2"><Button type="submit" loading={saving}>Resubmit for verification</Button></div>
      </form>
    </Card>
  );
}

export default function OwnerPharmacy() {
  const { data, error, loading, reload } = useApi('/pharmacies/mine/verification');
  if (loading && !data && !error) return <Loading />;
  if (error && error.status !== 404) return <ErrorBox error={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Pharmacy profile" subtitle="Your pharmacy details and licence verification." />
      {!data ? <RegisterForm onDone={reload} /> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title={data.name} action={<StatusBadge status={data.isSuspended ? 'Suspended' : data.status} />}>
            {data.status === 'Verified' && !data.isSuspended && <Notice tone="green">Verified: your pharmacy shows a Verified badge and appears in search results.</Notice>}
            {data.status === 'Pending' && <Notice tone="amber">Pending: an admin is reviewing your licence details. You can prepare your catalog in the meantime, but patients cannot see it yet.</Notice>}
            {data.status === 'Rejected' && <Notice tone="red" title="Rejected">{data.note || 'See the admin note.'} Correct the details below and resubmit.</Notice>}
            {data.isSuspended && <Notice tone="red" className="mt-3">Suspended after repeated valid complaints. Your pharmacy is hidden from search.</Notice>}
            <div className="mt-4 space-y-2 text-sm">
              <p><span className="text-slate-500">Trade licence:</span> <b>{data.licence.tradeLicenceNo}</b></p>
              <p><span className="text-slate-500">Drug licence:</span> <b>{data.licence.drugLicenceNo}</b></p>
              {data.licence.documentUrl && <a href={data.licence.documentUrl} target="_blank" rel="noreferrer" className="text-brand-700 underline">View licence document</a>}
            </div>
            <p className="mb-2 mt-5 text-sm font-semibold">Admin checklist</p>
            <ul className="space-y-1.5 text-sm">
              {CHECKS.map(([k, label]) => <li key={k}>{data.checklist && data.checklist[k] ? '✅' : '⬜'} {label}</li>)}
            </ul>
          </Card>
          <div className="space-y-6">
            {data.status !== 'Verified' && <ResubmitForm licence={data.licence} onDone={reload} />}
            <Card title="History">
              <ol className="space-y-3">
                {data.history.slice().reverse().map((h, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 text-sm">
                    <span><Badge tone={h.status === 'Verified' ? 'green' : h.status === 'Rejected' ? 'red' : 'amber'}>{h.status}</Badge> <span className="ml-1 text-slate-600">{h.note}</span></span>
                    <span className="shrink-0 text-slate-500">{dateTime(h.at)}</span>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
