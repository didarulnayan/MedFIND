import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext';
import { Avatar, Loading, cx } from './ui';

const ROLE_LABEL = { patient: 'Patient', owner: 'Pharmacy owner', admin: 'Administrator' };

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-xl font-bold leading-none text-white">+</span>
      <span className="text-xl font-extrabold tracking-tight">MedFind BD</span>
    </Link>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  if (!user) return null;
  const links = user.role === 'patient'
    ? [['My reservations', '/reservations'], ['My complaints', '/complaints']]
    : [['Dashboard', homeFor(user.role)]];
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-slate-50" aria-expanded={open}>
        <Avatar name={user.name} />
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-semibold">{user.name}</span>
          <span className="block text-xs text-slate-500">{ROLE_LABEL[user.role]}</span>
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-52 rounded-xl border border-slate-200 bg-white py-2 shadow-lg" onMouseLeave={() => setOpen(false)}>
          {links.map(([label, to]) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} className="block px-4 py-2 text-sm hover:bg-slate-50">{label}</Link>
          ))}
          <button type="button" className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50" onClick={() => { logout(); setOpen(false); navigate('/'); }}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

const PUBLIC_NAV = [
  { label: 'Home', to: '/', end: true },
  { label: 'Medicines', to: '/medicines' },
  { label: 'Nearby', to: '/nearby' },
  { label: 'Favourites', disabled: true },
];

/** Patient / visitor layout: top navigation bar. */
export function PublicLayout() {
  const { user } = useAuth();
  const [menu, setMenu] = useState(false);
  const navItem = (n) =>
    n.disabled ? (
      <span key={n.label} title="Coming in a later module" className="cursor-not-allowed py-2 text-slate-300">{n.label}</span>
    ) : (
      <NavLink key={n.label} to={n.to} end={n.end} onClick={() => setMenu(false)}
        className={({ isActive }) => cx('border-b-2 py-2 font-medium', isActive ? 'border-brand-700 text-brand-700' : 'border-transparent text-slate-500 hover:text-ink')}>
        {n.label}
      </NavLink>
    );
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
          <div className="flex items-center gap-10">
            <Logo />
            <nav className="hidden items-center gap-8 md:flex">{PUBLIC_NAV.map(navItem)}</nav>
          </div>
          <div className="flex items-center gap-3">
            {user ? <UserMenu /> : (
              <>
                <Link to="/login" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Log in</Link>
                <Link to="/register" className="hidden rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 sm:block">Sign up</Link>
              </>
            )}
            <button type="button" className="rounded-md p-2 md:hidden" onClick={() => setMenu((m) => !m)} aria-label="Menu">☰</button>
          </div>
        </div>
        {menu && <nav className="flex flex-col gap-1 border-t border-slate-100 px-4 py-3 md:hidden">{PUBLIC_NAV.map(navItem)}</nav>}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}

const PANEL_NAV = {
  owner: [
    { label: 'Dashboard', to: '/owner', end: true },
    { label: 'Pharmacy Profile', to: '/owner/pharmacy' },
    { label: 'Medicine Catalog', to: '/owner/catalog' },
    { label: 'Stock & Expiry', to: '/owner/stock' },
    { label: 'Reservations', to: '/owner/reservations' },
    { label: 'Complaints', to: '/owner/complaints' },
    { label: 'Alerts', disabled: true },
  ],
  admin: [
    { label: 'Pharmacy Verification', to: '/admin/pharmacies' },
    { label: 'Complaints', to: '/admin/complaints' },
    { label: 'Featured Pharmacies', disabled: true },
    { label: 'Master Medicines', disabled: true },
  ],
};

/** Pharmacy owner / admin layout: left sidebar (horizontal tabs on phones). */
export function PanelLayout({ role }) {
  const nav = PANEL_NAV[role];
  const item = (n, mobile) =>
    n.disabled ? (
      <span key={n.label} title="Coming in a later module" className={cx('cursor-not-allowed rounded-lg px-4 py-2.5 text-slate-300', mobile && 'whitespace-nowrap')}>{n.label}</span>
    ) : (
      <NavLink key={n.label} to={n.to} end={n.end}
        className={({ isActive }) => cx('rounded-lg px-4 py-2.5 font-medium', mobile && 'whitespace-nowrap', isActive ? 'bg-brand-100 font-semibold text-brand-800' : 'text-slate-600 hover:bg-slate-50')}>
        {n.label}
      </NavLink>
    );
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
        <Logo />
        <UserMenu />
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 lg:hidden">{nav.map((n) => item(n, true))}</nav>
      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-4 lg:flex">
          {nav.map((n) => item(n))}
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Route guard: only lets users with one of `roles` through. */
export function RequireRole({ roles, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}
