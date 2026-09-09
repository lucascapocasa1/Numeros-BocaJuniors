import { useState, useCallback } from 'react';

export function useFilters(defaults = {}) {
  const [filters, setFilters] = useState({
    page: 1,
    per_page: 15,
    sort_by: 'expiration_date',
    sort_dir: 'desc',
    ...defaults,
  });

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const setPage = useCallback((page) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ page: 1, per_page: 15, sort_by: 'expiration_date', sort_dir: 'desc', ...defaults });
  }, []);

  const cleanParams = useCallback(() => {
    const params = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) {
        params[k] = v;
      }
    });
    return params;
  }, [filters]);

  return { filters, updateFilter, setPage, resetFilters, cleanParams };
}
