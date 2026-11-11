// Search box with partial-match suggestions (Member 3 - F1-01). Used on Home, Search results and Nearby.
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { Badge, SearchInput, cx } from './ui';

/**
 * onSubmit(text)          user pressed Enter / chose a generic name
 * onPickBrand(suggestion) user chose a brand suggestion ({ id, name, ... })
 */
export default function MedicineSearchBox({ initial = '', onSubmit, onPickBrand, placeholder = 'Search by brand or generic name', autoFocus }) {
  const [text, setText] = useState(initial);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef(null);

  useEffect(() => setText(initial), [initial]);

  useEffect(() => {
    const q = text.trim();
    if (q.length < 2) {
      setItems([]);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      api('/search/suggestions', { query: { q, limit: 8 } })
        .then((d) => !cancelled && setItems(d.suggestions))
        .catch(() => !cancelled && setItems([]));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [text]);

  useEffect(() => {
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function choose(s) {
    setOpen(false);
    if (s.type === 'Brand' && onPickBrand) onPickBrand(s);
    else {
      setText(s.name);
      onSubmit && onSubmit(s.name);
    }
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && active >= 0 && items[active]) choose(items[active]);
      else { setOpen(false); onSubmit && onSubmit(text.trim()); }
    } else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div ref={box} className="relative">
      <SearchInput
        value={text}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(e) => { setText(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-autocomplete="list"
        aria-expanded={open && items.length > 0}
      />
      {open && items.length > 0 && (
        <ul className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg" role="listbox">
          {items.map((s, i) => (
            <li key={`${s.type}-${s.id || s.name}`} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(s)}
                className={cx('flex w-full items-center justify-between gap-3 px-4 py-3 text-left', i === active ? 'bg-brand-50' : 'hover:bg-slate-50')}>
                <span>
                  <span className="block font-semibold">{s.name}</span>
                  <span className="block text-xs text-slate-500">{s.subtitle}</span>
                </span>
                <Badge tone={s.type === 'Generic' ? 'teal' : 'violet'}>{s.type}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
