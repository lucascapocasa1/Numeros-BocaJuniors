import { useState, useEffect, useCallback, useRef } from 'react';

// Scroll infinito genérico para endpoints que devuelven { data, totals, meta: { current_page, last_page } }.
// Reinicia a página 1 cuando cambia `params` (comparado por JSON.stringify).
export function useInfiniteList(fetchFn, params = {}, { perPage = 15 } = {}) {
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const pageRef = useRef(1);
  const sentinelRef = useRef(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const paramsKey = JSON.stringify(params);

  const load = useCallback((page, append) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setItems([]);
    }
    setError(null);
    fetchFn({ page, per_page: perPage, ...paramsRef.current })
      .then((res) => {
        const { data, totals: t, meta } = res.data;
        pageRef.current = meta.current_page;
        setItems((prev) => (append ? [...prev, ...data] : data));
        setHasMore(meta.current_page < meta.last_page);
        setTotals(t ?? null);
      })
      .catch(() => setError('No se pudieron cargar los datos. Intentá de nuevo.'))
      .finally(() => (append ? setLoadingMore(false) : setLoading(false)));
  }, [fetchFn, perPage]);

  useEffect(() => {
    pageRef.current = 1;
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    load(pageRef.current + 1, true);
  }, [loading, loadingMore, hasMore, load]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '300px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const retry = useCallback(() => load(1, false), [load]);

  return { items, totals, loading, loadingMore, hasMore, error, sentinelRef, retry };
}
