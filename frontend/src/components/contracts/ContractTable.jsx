import { Link } from 'react-router-dom';
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

function formatSalary(amount, currency) {
  if (!amount) return '-';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function SourcesList({ links }) {
  if (!links?.length) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <div className="flex flex-col gap-0.5">
      {links.slice(0, 2).map((link, i) => (
        <div key={i} className="flex items-center gap-1">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-azul hover:underline text-xs truncate max-w-[110px]"
          >
            <SourceLabel url={link.url} />
          </a>
          {link.official && <OfficialBadge />}
        </div>
      ))}
      {links.length > 2 && (
        <span className="text-xs text-gray-400">+{links.length - 2} más</span>
      )}
    </div>
  );
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

export default function ContractTable({ contracts, sortBy = 'expiration_date', sortDir = 'desc', onSort }) {
  if (!contracts.length) {
    return <p className="text-gray-500 text-center py-8">No hay contratos.</p>;
  }

  return (
    <>
      {/* Vista en tarjetas para móvil */}
      <div className="block md:hidden space-y-3">
        {contracts.map((c) => {
          const effectiveEnd = c.termination_date || c.expiration_date;
          const vencido = new Date(effectiveEnd) < new Date();
          const hoy = new Date();
          const diasRestantes = Math.ceil((new Date(effectiveEnd) - hoy) / (1000 * 60 * 60 * 24));
          const proximoAVencer = !vencido && diasRestantes <= 90;

          return (
            <div key={c.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
              <div className="mb-2">
                <Link
                  to={`/contratos/${c.id}`}
                  className="text-azul font-semibold text-sm hover:underline leading-snug"
                >
                  {c.full_name}
                </Link>
                {c.loan && (
                  <div className="text-xs text-prestamo mt-0.5">
                    <p>A préstamo en {c.loan.club}{c.loan.until && ` · hasta ${formatDate(c.loan.until)}`}</p>
                    {c.loan.clauses?.map((clause, i) => (
                      <p key={i} className="text-prestamo">— {clause}</p>
                    ))}
                  </div>
                )}
              </div>

              {c.signing_date && (
                <div className="text-xs text-gray-500 mb-1">
                  Firma: <span className="font-medium text-gray-700">{formatDate(c.signing_date)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span className={`font-medium ${vencido ? 'text-red-600' : proximoAVencer ? 'text-amber-600' : 'text-gray-700'}`}>
                  {c.termination_date ? 'Rescindido' : 'Vence'}: {formatDate(effectiveEnd)}
                  {!c.termination_date && vencido && <span className="ml-1">(vencido)</span>}
                  {proximoAVencer && <span className="ml-1">(próximo)</span>}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-gray-500">
                  % Pase: <span className="font-mono font-medium text-gray-700">{c.club_pass_percentage}%</span>
                </span>
                <span className="font-mono font-semibold text-gray-800">
                  {formatSalary(c.estimated_salary, c.currency)}
                </span>
              </div>

              {c.links?.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <SourcesList links={c.links} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Vista en tabla para desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
              <th className="pb-3 pr-4 text-xs font-semibold tracking-wide uppercase text-gray-500">Jugador</th>
              <SortableHeader label="Firma" field="signing_date" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <SortableHeader label="Vencimiento" field="expiration_date" sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
              <th className="pb-3 pr-4 text-xs font-semibold tracking-wide uppercase text-gray-500 text-right">% Pase</th>
              <SortableHeader label="Salario est." field="estimated_salary" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="text-right" />
              <th className="pb-3 text-xs font-semibold tracking-wide uppercase text-gray-500">Fuentes</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => {
              const effectiveEnd = c.termination_date || c.expiration_date;
              const vencido = new Date(effectiveEnd) < new Date();
              return (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium">
                    <div className="flex flex-col gap-0.5">
                      <Link to={`/contratos/${c.id}`} className="text-azul hover:underline">
                        {c.full_name}
                      </Link>
                      {c.loan && (
                        <div className="text-xs text-prestamo">
                          <p>A préstamo en {c.loan.club}{c.loan.until && ` · hasta ${formatDate(c.loan.until)}`}</p>
                          {c.loan.clauses?.map((clause, i) => (
                            <p key={i} className="text-prestamo">— {clause}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap text-gray-600">
                    {formatDate(c.signing_date)}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    {c.termination_date ? (
                      <span className="text-red-600">Rescindido: {formatDate(c.termination_date)}</span>
                    ) : (
                      <>
                        <span className={vencido ? 'text-red-600' : ''}>{formatDate(c.expiration_date)}</span>
                        {vencido && <span className="ml-1 text-xs text-red-500">(vencido)</span>}
                      </>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right font-mono">{c.club_pass_percentage}%</td>
                  <td className="py-3 pr-4 text-right font-mono whitespace-nowrap">
                    {formatSalary(c.estimated_salary, c.currency)}
                  </td>
                  <td className="py-3">
                    <SourcesList links={c.links} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
