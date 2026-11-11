// Member 3 - Feature 1: Search results and filters (F1-02) + No results found (F1-03)
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApi } from '../../lib/useApi';
import { priceRange } from '../../lib/format';
import MedicineSearchBox from '../../components/MedicineSearchBox';
import { Badge, Button, EmptyState, ErrorBox, Input, LinkButton, Loading, Pagination, Select, Toggle, cx } from '../../components/ui';

const list = (v) => (v ? v.split(',').filter(Boolean) : []);

export default function SearchResults() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const q = params.get('q') || '';

  // applied filters live in the URL so results can be shared / reloaded
  const applied = useMemo(() => ({
    dosageForm: list(params.get('dosageForm')),
    strength: list(params.get('strength')),
    manufacturer: list(params.get('manufacturer')),
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    inStock: params.get('inStock') === 'true',
    sort: params.get('sort') || 'relevance',
    page: Number(params.get('page')) || 1,
  }), [params]);

  const [draft, setDraft] = useState(applied);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => setDraft(applied), [applied]);

  const query = { q, ...applied, inStock: applied.inStock ? 'true' : undefined, limit: 10 };
  const { data, error, loading, reload } = useApi('/search/medicines', query);
  const { data: facets } = useApi('/search/filters', { q });
  const { data: popular } = useApi(data && data.total === 0 ? '/search/popular' : null, { limit: 4 });

  function apply(next, keepPage = false) {
    const p = { q };
    for (const [k, v] of Object.entries(next)) {
      if (k === 'page' && !keepPage) continue;
      if (Array.isArray(v) ? v.length : v && !(k === 'sort' && v === 'relevance')) p[k] = Array.isArray(v) ? v.join(',') : String(v);
    }
    setParams(p);
    setFiltersOpen(false);
  }

  const toggle = (key, value) => setDraft((d) => ({ ...d, [key]: d[key].includes(value) ? d[key].filter((x) => x !== value) : [...d[key], value] }));
  const clearAll = () => setParams(q ? { q } : {});
  const removeChip = (key, value) => apply({ ...applied, [key]: Array.isArray(applied[key]) ? applied[key].filter((x) => x !== value) : key === 'inStock' ? false : '' });

  const chips = [
    ...applied.dosageForm.map((v) => ['dosageForm', v, v]),
    ...applied.strength.map((v) => ['strength', v, v]),
    ...applied.manufacturer.map((v) => ['manufacturer', v, v]),
    ...(applied.minPrice ? [['minPrice', applied.minPrice, `From Tk ${applied.minPrice}`]] : []),
    ...(applied.maxPrice ? [['maxPrice', applied.maxPrice, `Up to Tk ${applied.maxPrice}`]] : []),
    ...(applied.inStock ? [['inStock', true, 'In stock only']] : []),
  ];

  const check = (key, f) => (
    <label key={f.value} className="flex cursor-pointer items-center justify-between gap-3 py-1 text-sm">
      <span className="flex items-center gap-2.5">
        <input type="checkbox" className="h-4 w-4 accent-[#0f6e63]" checked={draft[key].includes(f.value)} onChange={() => toggle(key, f.value)} />
        {f.value}
      </span>
      <span className="text-slate-400">{f.count}</span>
    </label>
  );

  const filterPanel = (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-lg font-bold">Filters</h2>
        <button type="button" className="text-sm font-medium text-brand-700" onClick={clearAll}>Clear all</button>
      </div>
      {facets ? (
        <div className="space-y-5">
          <div><p className="mb-1.5 text-sm font-bold">Dosage form</p>{facets.dosageForms.map((f) => check('dosageForm', f))}</div>
          <div>
            <p className="mb-2 text-sm font-bold">Strength</p>
            <div className="flex flex-wrap gap-2">
              {facets.strengths.slice(0, 12).map((f) => (
                <button key={f.value} type="button" onClick={() => toggle('strength', f.value)}
                  className={cx('rounded-full border px-3 py-1 text-xs font-medium', draft.strength.includes(f.value) ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-300 hover:border-brand-500')}>
                  {f.value}
                </button>
              ))}
            </div>
          </div>
          <div><p className="mb-1.5 text-sm font-bold">Manufacturer</p>{facets.manufacturers.slice(0, 8).map((f) => check('manufacturer', f))}</div>
          <div>
            <p className="mb-2 text-sm font-bold">Price range (per unit)</p>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" step="0.5" placeholder={facets.priceRange ? `Tk ${facets.priceRange.min}` : 'Min'} value={draft.minPrice} onChange={(e) => setDraft({ ...draft, minPrice: e.target.value })} aria-label="Minimum price" />
              <span className="text-slate-400">-</span>
              <Input type="number" min="0" step="0.5" placeholder={facets.priceRange ? `Tk ${facets.priceRange.max}` : 'Max'} value={draft.maxPrice} onChange={(e) => setDraft({ ...draft, maxPrice: e.target.value })} aria-label="Maximum price" />
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <Toggle checked={draft.inStock} onChange={(v) => setDraft({ ...draft, inStock: v })} label="In stock only" hint="Hide medicines no pharmacy has in stock" />
          </div>
          <Button className="w-full" onClick={() => apply(draft)}>Apply filters</Button>
        </div>
      ) : <Loading />}
    </div>
  );

  return (
    <>
      <div className="mb-6 max-w-3xl">
        <MedicineSearchBox initial={q} onSubmit={(t) => setParams(t ? { q: t } : {})} onPickBrand={(s) => navigate(`/medicines/${s.id}`)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="hidden lg:block">{filterPanel}</aside>
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">{data ? `${data.total} result${data.total === 1 ? '' : 's'}` : 'Results'}{q && ` for "${q}"`}</h1>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" className="lg:hidden" onClick={() => setFiltersOpen((o) => !o)}>Filters</Button>
              <Select className="w-auto" value={applied.sort} onChange={(e) => apply({ ...applied, sort: e.target.value })} aria-label="Sort results">
                <option value="relevance">Most relevant</option>
                <option value="price_asc">Lowest price</option>
                <option value="price_desc">Highest price</option>
                <option value="pharmacies">Most pharmacies</option>
                <option value="name">Name A-Z</option>
              </Select>
            </div>
          </div>
          {filtersOpen && <div className="mb-4 lg:hidden">{filterPanel}</div>}
          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {chips.map(([key, value, label]) => (
                <button key={`${key}-${value}`} type="button" onClick={() => removeChip(key, value)} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm hover:border-red-300 hover:text-red-600">
                  {label} ✕
                </button>
              ))}
            </div>
          )}
          {error ? <ErrorBox error={error} onRetry={reload} /> : !data ? <Loading /> : data.total === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white">
              <EmptyState icon="🔍" title={`No medicines found for "${q}"`}
                actions={<><Button variant="secondary" onClick={clearAll}>Clear filters</Button><Button onClick={() => setParams({})}>Search again</Button></>}>
                Check the spelling or try a generic name. You can also clear some filters.
                {popular && popular.popular.length > 0 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {popular.popular.map((p) => (
                      <button key={p.term} type="button" onClick={() => setParams({ q: p.term })} className="rounded-full border border-slate-300 px-3 py-1 text-sm text-ink hover:border-brand-500">{p.term}</button>
                    ))}
                  </div>
                )}
              </EmptyState>
            </div>
          ) : (
            <>
              <div className={cx('space-y-3', loading && 'opacity-60')}>
                {data.results.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-2xl">💊</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold">{r.brandName}</p>
                      <p className="text-sm text-slate-500">{r.genericName} | {r.manufacturer}</p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        <Badge tone="violet">{r.dosageForm}</Badge>
                        <Badge>{r.strength}</Badge>
                        {r.requiresPrescription && <Badge tone="amber">Prescription</Badge>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{priceRange(r.priceRange, r.unit)}</p>
                      <p className={cx('mt-1 text-sm', r.pharmacyCount ? 'text-emerald-700' : 'text-slate-400')}>
                        {r.pharmacyCount} pharmac{r.pharmacyCount === 1 ? 'y lists' : 'ies list'} this
                      </p>
                      <LinkButton to={`/medicines/${r.id}`} variant="soft" size="sm" className="mt-2">View details</LinkButton>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination pagination={data.pagination} onPage={(page) => apply({ ...applied, page }, true)} />
            </>
          )}
          {data && <p className="mt-6 text-xs text-slate-400">{data.disclaimer}</p>}
        </section>
      </div>
    </>
  );
}
