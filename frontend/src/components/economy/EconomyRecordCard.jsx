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

function formatMoney(amount, currency) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency || 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function EconomyRecordCard({ record: r }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={r.type === 'cobro' ? 'badge-cobro' : 'badge-pago'}>
          {r.type}
        </span>
        <span className="font-mono font-semibold text-sm">
          {formatMoney(r.amount, r.currency)}
        </span>
      </div>
      <Link to={`/economia/${r.id}`} className="block text-sm font-medium text-gray-800 mb-2 leading-snug hover:text-azul hover:underline">
        {r.description || '-'}
      </Link>
      {r.entity && (
        <p className="text-xs text-gray-500 mb-1">{r.entity}</p>
      )}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span>{formatDate(r.record_date)}</span>
      </div>
      {Array.isArray(r.links) && r.links.length > 0 && (
        <ul className="text-xs text-gray-600 space-y-0.5 border-t border-gray-100 pt-2 mt-1">
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
      )}
    </div>
  );
}
