import { Link } from 'react-router-dom';
import EconomyRecordCard from './EconomyRecordCard';
import OfficialBadge from '../OfficialBadge';
import SourceLabel from '../SourceLabel';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

function formatMoney(amount, currency) {
  const fmt = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency || 'ARS',
    maximumFractionDigits: 0,
  });
  return fmt.format(amount);
}

function SortIcon({ active, dir }) {
  if (!active) return <span className="ml-1 text-gray-300">↕</span>;
  return <span className="ml-1 text-azul">{dir === 'asc' ? '↑' : '↓'}</span>;
}

function SortableHeader({ label, field, sortBy, sortDir, onSort, className = '' }) {
  const active = sortBy === field;
  return (
    <th className={`pb-3 pr-4 ${className}`}>
      <button
        onClick={() => onSort(field)}
        className={`flex items-center gap-0 uppercase text-xs font-semibold tracking-wide transition-colors ${
          active ? 'text-azul' : 'text-gray-500 hover:text-gray-800'
        } ${className.includes('text-right') ? 'ml-auto' : ''}`}
      >
        {label}
        <SortIcon active={active} dir={sortDir} />
      </button>
    </th>
  );
}

export default function EconomyTable({ records, sortBy, sortDir, onSort }) {
  if (!records.length) {
    return <p className="text-gray-500 text-center py-8">No hay registros.</p>;
  }

  return (
    <>
      {/* Vista en tarjetas para móvil */}
      <div className="block md:hidden space-y-3">
        {records.map((r) => (
          <EconomyRecordCard key={r.id} record={r} />
        ))}
      </div>

      {/* Vista en tabla para desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
              <SortableHeader label="Fecha" field="record_date" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th className="pb-3 pr-4">Descripcion</th>
              <th className="pb-3 pr-4">Entidad</th>
              <th className="pb-3 pr-4">Tipo</th>
              <SortableHeader label="Monto" field="amount" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-right" />
              <th className="pb-3">Efectuado</th>
              <th className="pb-3">Fuentes</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 pr-4 whitespace-nowrap">{formatDate(r.record_date)}</td>
                <td className="py-3 pr-4">
                  <Link to={`/economia/${r.id}`} className="font-medium text-gray-900 hover:text-azul hover:underline">
                    {r.description
                      ? (r.description.length > 60 ? r.description.slice(0, 60) + '...' : r.description)
                      : '-'}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-gray-600 text-xs">
                  {r.entity || '-'}
                </td>
                <td className="py-3 pr-4">
                  <span className={r.type === 'cobro' ? 'badge-cobro' : 'badge-pago'}>
                    {r.type}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right font-mono whitespace-nowrap">
                  {formatMoney(r.amount, r.currency)}
                </td>
                <td className="py-3">
                  {r.carried_out_date ? (
                    <span className="text-ingreso text-xs font-semibold">{formatDate(r.carried_out_date)}</span>
                  ) : (
                    <span className="text-gray-400 text-xs">No</span>
                  )}
                </td>
                <td className="py-3">
                  {Array.isArray(r.links) && r.links.length > 0 ? (
                    <ul className="text-xs text-gray-600 space-y-0.5">
                      {r.links.slice(0, 2).map((link, i) => (
                        <li key={i} className="flex items-center gap-1">
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-azul hover:underline truncate block">
                            <SourceLabel url={link.url} />
                          </a>
                          {link.official && <OfficialBadge />}
                        </li>
                      ))}
                      {r.links.length > 2 && (
                        <li className="text-gray-400">+{r.links.length - 2} más</li>
                      )}
                    </ul>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
