// Common (not an assessed feature): log in and sign up
import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { homeFor, useAuth } from '../../context/AuthContext';
import { Button, ErrorBox, Field, Input, cx } from '../../components/ui';
import { Logo } from '../../components/layouts';

function Shell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-7">
          <h1 className="text-2xl font-extrabold">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

const DEMO = [
  ['Patient', 'ayesha@medfind.test', 'Password@123'],
  ['Pharmacy owner', 'rahim.owner@medfind.test', 'Password@123'],
  ['Admin', 'admin@medfind.test', 'Admin@12345'],
];

export function Login() {
  const { user, login } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const next = params.get('next');

  if (user) return <Navigate to={next || homeFor(user.role)} replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await login(form.email, form.password);
      navigate(next || homeFor(u.role), { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell title="Log in" subtitle="Welcome back to MedFind BD.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><Input type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Password"><Input type="password" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <ErrorBox error={error} />
        <Button type="submit" className="w-full" loading={busy}>Log in</Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">New here? <Link to="/register" className="font-semibold text-brand-700">Create an account</Link></p>
      <div className="mt-6 rounded-lg bg-slate-50 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Demo accounts (development data)</p>
        <div className="space-y-1.5">
          {DEMO.map(([role, email, password]) => (
            <button key={email} type="button" onClick={() => setForm({ email, password })} className="flex w-full justify-between rounded-md px-2 py-1 text-left text-sm hover:bg-white">
              <span className="font-medium">{role}</span><span className="text-slate-500">{email}</span>
            </button>
          ))}
        </div>
      </div>
    </Shell>
  );
}

export function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'patient' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  if (user) return <Navigate to={homeFor(user.role)} replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await register({ ...form, phone: form.phone || undefined });
      navigate(u.role === 'owner' ? '/owner/pharmacy' : '/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Shell title="Create an account" subtitle="Reserve medicines, or list your pharmacy.">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[['patient', 'I am a patient'], ['owner', 'I own a pharmacy']].map(([v, label]) => (
            <button key={v} type="button" onClick={() => setForm({ ...form, role: v })}
              className={cx('rounded-lg border px-3 py-2.5 text-sm font-medium', form.role === v ? 'border-brand-500 bg-brand-50 text-brand-800' : 'border-slate-200')}>{label}</button>
          ))}
        </div>
        <Field label="Full name"><Input required minLength={2} value={form.name} onChange={set('name')} /></Field>
        <Field label="Email"><Input type="email" required value={form.email} onChange={set('email')} /></Field>
        <Field label="Mobile number (optional)" hint="11 digits, e.g. 01712345678"><Input pattern="01[0-9]{9}" value={form.phone} onChange={set('phone')} /></Field>
        <Field label="Password" hint="At least 8 characters"><Input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} /></Field>
        <ErrorBox error={error} />
        <Button type="submit" className="w-full" loading={busy}>Create account</Button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">Already have an account? <Link to="/login" className="font-semibold text-brand-700">Log in</Link></p>
    </Shell>
  );
}
