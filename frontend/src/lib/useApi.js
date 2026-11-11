import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

/**
 * Loads data from the API when `path` or `query` changes.
 * Returns { data, error, loading, reload, setData }. Pass path = null to skip loading.
 * `loading` is true from the very first render of a new request (no frame with stale "not loading" state).
 */
export function useApi(path, query) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [doneKey, setDoneKey] = useState(null);
  const key = JSON.stringify(query || {});
  const requestKey = path ? `${path}?${key}` : null;
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!path) return;
    const id = ++seq.current;
    setBusy(true);
    setError(null);
    try {
      const result = await api(path, { query: JSON.parse(key) });
      if (id === seq.current) setData(result);
    } catch (err) {
      if (id === seq.current) setError(err);
    } finally {
      if (id === seq.current) {
        setBusy(false);
        setDoneKey(`${path}?${key}`);
      }
    }
  }, [path, key]);

  useEffect(() => {
    load();
  }, [load]);

  const loading = Boolean(requestKey) && (busy || doneKey !== requestKey);
  return { data, error, loading, reload: load, setData };
}
