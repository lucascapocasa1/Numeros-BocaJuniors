import FilterBar from '../common/FilterBar';
import QuickFilterPills from '../common/QuickFilterPills';

const TYPE_OPTIONS = [
  { value: null, label: 'Todos' },
  { value: 'cobro', label: 'Cobros' },
  { value: 'pago', label: 'Pagos' },
];

const DROPDOWN_KEYS = ['search', 'currency', 'carried_out', 'date_from', 'date_to'];

export default function EconomyFilters({ filters, onFilter, onReset }) {
  const activeCount = DROPDOWN_KEYS.filter(
    (key) => filters[key] !== null && filters[key] !== undefined && filters[key] !== ''
  ).length;

  const overdueActive = filters.overdue === '1';

  const toggleOverdue = () => {
    if (overdueActive) {
      onFilter('overdue', null);
      onFilter('carried_out', null);
    } else {
      onFilter('overdue', '1');
      onFilter('carried_out', '0');
    }
  };

  return (
    <>
      <QuickFilterPills
        options={[
          ...TYPE_OPTIONS.map((opt) => ({
            label: opt.label,
            active: (filters.type ?? null) === opt.value,
            onClick: () => onFilter('type', opt.value),
          })),
          { label: 'Vencidos', active: overdueActive, onClick: toggleOverdue },
        ]}
      />
      <FilterBar onReset={onReset} activeCount={activeCount}>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => onFilter('search', e.target.value || null)}
            placeholder="Descripción o entidad"
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Moneda</label>
          <select
            value={filters.currency || ''}
            onChange={(e) => onFilter('currency', e.target.value || null)}
            className="input-field"
          >
            <option value="">Todas</option>
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Confirmado</label>
          <select
            value={filters.carried_out ?? ''}
            onChange={(e) => onFilter('carried_out', e.target.value === '' ? null : e.target.value)}
            className="input-field"
          >
            <option value="">Todos</option>
            <option value="1">Confirmado</option>
            <option value="0">Sin confirmar</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
          <input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => onFilter('date_from', e.target.value || null)}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
          <input
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => onFilter('date_to', e.target.value || null)}
            className="input-field"
          />
        </div>
      </FilterBar>
    </>
  );
}
