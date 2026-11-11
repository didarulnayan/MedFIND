// Member 3 - Feature 1: Search with suggestions (F1-01) - home page
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../lib/useApi';
import MedicineSearchBox from '../../components/MedicineSearchBox';

export default function Home() {
  const navigate = useNavigate();
  const { data } = useApi('/search/popular', { limit: 6 });
  const go = (q) => navigate(q ? `/medicines?q=${encodeURIComponent(q)}` : '/medicines');

  return (
    <div className="mx-auto max-w-3xl py-10 text-center sm:py-16">
      <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Find your medicine, nearby</h1>
      <p className="mt-3 text-lg text-slate-500">Search by brand or generic name and see which pharmacies list it.</p>
      <div className="mt-8 text-left">
        <MedicineSearchBox autoFocus onSubmit={go} onPickBrand={(s) => navigate(`/medicines/${s.id}`)} />
      </div>
      {data && data.popular.length > 0 && (
        <div className="mt-8">
          <p className="mb-3 text-sm font-semibold text-slate-500">Popular searches</p>
          <div className="flex flex-wrap justify-center gap-2">
            {data.popular.map((p) => (
              <button key={p.term} type="button" onClick={() => go(p.term)} className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium hover:border-brand-500 hover:text-brand-700">
                {p.term}
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="mt-8 text-sm text-slate-400">Not finding it? Try a different spelling or the generic name.</p>
      <div className="mt-12 grid gap-4 text-left sm:grid-cols-3">
        {[
          ['🔎', 'Search', 'Brand or generic name, filtered by form, strength and price.'],
          ['📍', 'Find nearby', 'Verified pharmacies around you that have it in stock.'],
          ['🧾', 'Reserve', 'Send a request and pick it up when it is ready.'],
        ].map(([icon, title, text]) => (
          <div key={title} className="rounded-xl border border-slate-200 bg-white p-5">
            <span className="text-2xl">{icon}</span>
            <p className="mt-2 font-bold">{title}</p>
            <p className="text-sm text-slate-500">{text}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 text-xs text-slate-400">Availability and prices are reported by pharmacies. Please confirm with the pharmacy before travelling. MedFind BD does not give medical advice.</p>
    </div>
  );
}
