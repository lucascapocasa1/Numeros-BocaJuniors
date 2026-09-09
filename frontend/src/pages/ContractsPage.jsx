import { useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getContracts } from '../api/endpoints';
import { useFilters } from '../hooks/useFilters';
import { useInfiniteList } from '../hooks/useInfiniteList';
import { usePageMeta } from '../hooks/usePageMeta';
import ContractFilters from '../components/contracts/ContractFilters';
import ContractTable from '../components/contracts/ContractTable';
import ContractTotalsCard from '../components/contracts/ContractTotalsCard';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';

const CONTRACT_FILTER_KEYS = ['search', 'status', 'validity', 'loan', 'date_from', 'date_to', 'expire_from', 'expire_to'];
const ALLOWED_SORT_FIELDS = ['expiration_date', 'signing_date', 'estimated_salary'];

export default function ContractsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialFilters = {};
  CONTRACT_FILTER_KEYS.forEach((key) => {
    const val = searchParams.get(key);
    if (val !== null && val !== '') initialFilters[key] = val;
  });
  if (initialFilters.status === undefined) initialFilters.status = 'vigente';

  const initialSortBy = ALLOWED_SORT_FIELDS.includes(searchParams.get('sort_by'))
    ? searchParams.get('sort_by')
    : 'expiration_date';
  const initialSortDir = searchParams.get('sort_dir') === 'asc' ? 'asc' : 'desc';

  const { filters, updateFilter, resetFilters, cleanParams } = useFilters({
    ...initialFilters,
    sort_by: initialSortBy,
    sort_dir: initialSortDir,
  });

  usePageMeta({
    title: 'Contratos de jugadores de Boca Juniors | Números Boca Juniors',
    description: 'Contratos profesionales del plantel de Boca Juniors: fechas de vencimiento, salarios estimados, cláusulas y porcentajes del pase. Datos actualizados.',
    path: '/contratos',
  });

  // Sync all filters and sort state to URL for shareability
  useEffect(() => {
    const params = {};
    if (filters.sort_by && filters.sort_by !== 'expiration_date') params.sort_by = filters.sort_by;
    if (filters.sort_dir && filters.sort_dir !== 'desc') params.sort_dir = filters.sort_dir;
    CONTRACT_FILTER_KEYS.forEach((key) => {
      const val = filters[key];
      if (val !== null && val !== undefined && val !== '') params[key] = val;
    });
    setSearchParams(params, { replace: true });
  }, [filters.sort_by, filters.sort_dir, filters.search, filters.status, filters.validity, filters.loan, filters.date_from, filters.date_to, filters.expire_from, filters.expire_to]);

  const handleSort = useCallback((field) => {
    if (filters.sort_by === field) {
      updateFilter('sort_dir', filters.sort_dir === 'desc' ? 'asc' : 'desc');
    } else {
      updateFilter('sort_by', field);
      updateFilter('sort_dir', 'desc');
    }
  }, [filters.sort_by, filters.sort_dir, updateFilter]);

  const { page: _page, per_page: _perPage, ...queryParams } = cleanParams();
  const { items, totals, loading, loadingMore, hasMore, error, sentinelRef, retry } =
    useInfiniteList(getContracts, queryParams, { perPage: 15 });

  const lastUpdated = totals?.last_updated_at
    ? new Date(totals.last_updated_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold mb-1">Contratos profesionales</h1>
      {lastUpdated && (
        <p className="text-xs text-gray-400 mb-1">Última actualización: {lastUpdated}</p>
      )}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-400">Compartir</span>
        <a
          href={`https://wa.me/?text=${encodeURIComponent('Mirá los contratos del plantel de Boca Juniors: ' + window.location.href)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-green-600 transition-colors"
          aria-label="Compartir por WhatsApp"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
        <a
          href={`https://x.com/intent/tweet?text=${encodeURIComponent('Mirá los contratos del plantel de Boca Juniors: ' + window.location.href)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-gray-900 transition-colors"
          aria-label="Compartir en X"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
      </div>

      <ContractFilters filters={filters} onFilter={updateFilter} onReset={resetFilters} />

      <ContractTotalsCard totals={totals} />

      {loading ? (
        <Loader />
      ) : error ? (
        <div className="card">
          <ErrorMessage message={error} onRetry={retry} />
        </div>
      ) : (
        <div className="card">
          <ContractTable
            contracts={items}
            sortBy={filters.sort_by}
            sortDir={filters.sort_dir}
            onSort={handleSort}
          />
          {hasMore && <div ref={sentinelRef} className="h-1" />}
          {loadingMore && (
            <div className="flex justify-center py-6">
              <Loader />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
