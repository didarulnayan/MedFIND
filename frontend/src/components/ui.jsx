// Reusable UI building blocks styled after the MedFind BD Figma designs.
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { errorText } from '../lib/api';
import { initials } from '../lib/format';

const cx = (...c) => c.filter(Boolean).join(' ');

const BTN = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 border border-brand-700',
  secondary: 'bg-white text-ink border border-slate-300 hover:bg-slate-50',
  soft: 'bg-brand-100 text-brand-800 border border-brand-100 hover:bg-brand-200',
  danger: 'bg-white text-red-600 border border-red-300 hover:bg-red-50',
  dangerSolid: 'bg-red-600 text-white border border-red-600 hover:bg-red-700',
  ghost: 'text-brand-700 hover:bg-brand-50',
};
const SIZE = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3 text-base' };

export function Button({ variant = 'primary', size = 'md', className, loading, children, ...props }) {
  return (
    <button
      className={cx('inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50', BTN[variant], SIZE[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export function LinkButton({ to, variant = 'primary', size = 'md', className, children }) {
  return (
    <Link to={to} className={cx('inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition', BTN[variant], SIZE[size], className)}>
      {children}
    </Link>
  );
}

export function Card({ className, children, title, action }) {
  return (
    <section className={cx('rounded-xl border border-slate-200 bg-white', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          {title && <h2 className="text-base font-bold">{title}</h2>}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const BADGE_TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  teal: 'bg-brand-100 text-brand-800 ring-brand-200',
  gray: 'bg-slate-100 text-slate-600 ring-slate-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
};

const STATUS_TONE = {
  'In stock': 'green', 'Low stock': 'amber', 'Out of stock': 'red', Expired: 'red', 'Expiring soon': 'amber', Good: 'green',
  'No expiry': 'gray', Depleted: 'gray',
  Pending: 'amber', Confirmed: 'blue', ReadyForPickup: 'teal', 'Ready for pickup': 'teal', Collected: 'green',
  Rejected: 'red', Cancelled: 'gray',
  Verified: 'green', Suspended: 'red',
  Open: 'amber', UnderReview: 'blue', 'Under Review': 'blue', Resolved: 'green', Dismissed: 'gray',
};
const STATUS_LABEL = { ReadyForPickup: 'Ready for pickup', UnderReview: 'Under Review' };

export function Badge({ tone = 'gray', children, className }) {
  return <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', BADGE_TONES[tone], className)}>{children}</span>;
}

export function StatusBadge({ status, label }) {
  return <Badge tone={STATUS_TONE[status] || 'gray'}>{label || STATUS_LABEL[status] || status}</Badge>;
}

export function VerifiedBadge() {
  return <Badge tone="green">✓ Verified</Badge>;
}

export function Field({ label, required, hint, error, children, className }) {
  return (
    <label className={cx('block', className)}>
      {label && (
        <span className="mb-1.5 block text-sm font-semibold text-slate-700">
          {label} {required && <span className="text-red-600">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

const INPUT = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-500';

export function Input({ className, suffix, ...props }) {
  if (!suffix) return <input className={cx(INPUT, className)} {...props} />;
  return (
    <div className="relative">
      <input className={cx(INPUT, 'pr-14', className)} {...props} />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">{suffix}</span>
    </div>
  );
}

export function Select({ className, children, ...props }) {
  return <select className={cx(INPUT, 'pr-8', className)} {...props}>{children}</select>;
}

export function Textarea({ className, ...props }) {
  return <textarea className={cx(INPUT, 'min-h-24', className)} {...props} />;
}

export function SearchInput({ className, ...props }) {
  return (
    <div className={cx('relative', className)}>
      <svg className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input type="search" className={cx(INPUT, 'py-3 pl-11')} {...props} />
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose && onClose()}>
      <div role="dialog" aria-modal="true" className={cx('w-full rounded-t-2xl bg-white shadow-xl sm:rounded-2xl', size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">✕</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Loading({ label = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      {label}
    </div>
  );
}

export function ErrorBox({ error, onRetry, className }) {
  if (!error) return null;
  return (
    <div className={cx('flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700', className)} role="alert">
      <span>{typeof error === 'string' ? error : errorText(error)}</span>
      {onRetry && <Button size="sm" variant="danger" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Notice({ tone = 'amber', title, children, className }) {
  const tones = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    teal: 'border-brand-200 bg-brand-50 text-brand-800',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    red: 'border-red-200 bg-red-50 text-red-800',
  };
  return (
    <div className={cx('rounded-lg border px-4 py-3 text-sm', tones[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? 'mt-1' : ''}>{children}</div>
    </div>
  );
}

export function EmptyState({ icon = '🔍', title, children, actions }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-3xl">{icon}</div>
      <h3 className="text-lg font-bold">{title}</h3>
      {children && <div className="mt-2 max-w-md text-sm text-slate-500">{children}</div>}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}

/** Pill tabs like "All (24) | In stock | Low stock". */
export function Chips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx('rounded-full border px-4 py-1.5 text-sm font-medium transition', value === o.value ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white text-ink hover:border-brand-500')}
        >
          {o.label}
          {o.count !== undefined && ` (${o.count})`}
        </button>
      ))}
    </div>
  );
}

export function Pagination({ pagination, onPage, label }) {
  if (!pagination) return null;
  const { page, totalPages, total, limit } = pagination;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1);
  const btn = 'h-9 min-w-9 rounded-lg border px-2 text-sm font-medium';
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-500">{label ? label(from, to, total) : `Showing ${from}-${to} of ${total}`}</p>
      {totalPages > 1 && (
        <div className="flex gap-2">
          <button className={cx(btn, 'border-slate-300 bg-white disabled:opacity-40')} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">‹</button>
          {pages.map((p) => (
            <button key={p} className={cx(btn, p === page ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 bg-white')} onClick={() => onPage(p)}>{p}</button>
          ))}
          <button className={cx(btn, 'border-slate-300 bg-white disabled:opacity-40')} disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page">›</button>
        </div>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, badge, crumbs }) {
  return (
    <div className="mb-6">
      {crumbs && <Breadcrumbs items={crumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            {title} {badge}
          </h1>
          {subtitle && <p className="mt-1.5 text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
    </div>
  );
}

export function Breadcrumbs({ items }) {
  return (
    <nav className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
      {items.map((it, i) => (
        <span key={it.label} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden="true">›</span>}
          {it.to ? <Link to={it.to} className="hover:text-brand-700">{it.label}</Link> : <span className="font-medium text-ink">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function Stars({ value = 0, size = 'text-base' }) {
  const full = Math.round(value);
  return (
    <span className={cx('tracking-tight text-amber-400', size)} aria-label={`${value} out of 5 stars`}>
      {'★★★★★'.slice(0, full)}
      <span className="text-slate-300">{'★★★★★'.slice(full)}</span>
    </span>
  );
}

export function Avatar({ name, size = 'h-9 w-9' }) {
  return <span className={cx('flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-800', size)}>{initials(name)}</span>;
}

export function InfoRows({ rows }) {
  return (
    <dl className="divide-y divide-slate-100">
      {rows.filter(Boolean).map(([k, v]) => (
        <div key={k} className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3 text-sm">
          <dt className="text-slate-500">{k}</dt>
          <dd className="text-right font-medium text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-brand-700" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function StatCard({ label, value, tone }) {
  const color = { red: 'text-red-600', amber: 'text-amber-600', teal: 'text-brand-700' }[tone] || 'text-ink';
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={cx('mt-1 text-2xl font-extrabold', color)}>{value}</p>
    </div>
  );
}

/** Responsive table wrapper: horizontal scroll inside the card on small screens. */
export function Table({ head, children, className }) {
  return (
    <div className={cx('overflow-x-auto rounded-xl border border-slate-200 bg-white', className)}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>{head.map((h) => <th key={h} className="px-5 py-3.5">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function FileInput({ label, hint, onChange, multiple, file }) {
  const names = file ? (Array.isArray(file) ? file.map((f) => f.name).join(', ') : file.name) : '';
  return (
    <Field label={label} hint={hint}>
      <span className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 hover:border-brand-500">
        <span className="font-medium text-brand-700">{names || 'Click to choose an image'}</span>
        <span className="mt-1 text-xs">PNG or JPG up to 5 MB{multiple ? ' each' : ''}</span>
        <input type="file" accept="image/png,image/jpeg" multiple={multiple} className="sr-only" onChange={(e) => onChange(multiple ? Array.from(e.target.files) : e.target.files[0] || null)} />
      </span>
    </Field>
  );
}

export { cx };
