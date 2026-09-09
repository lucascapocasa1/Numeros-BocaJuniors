import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getContract } from '../api/endpoints';
import { usePageMeta } from '../hooks/usePageMeta';
import Loader from '../components/common/Loader';
import OfficialBadge from '../components/OfficialBadge';
import SourceLabel from '../components/SourceLabel';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

function formatDateLocal(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

const FIELD_LABELS = {
  full_name: 'Nombre',
  signing_date: 'Fecha de firma',
  expiration_date: 'Fecha de vencimiento',
  termination_date: 'Fecha de rescisión',
  club_pass_percentage: '% Pase club',
  estimated_salary: 'Salario estimado',
  currency: 'Moneda',
};

const DATE_FIELDS = new Set(['signing_date', 'expiration_date', 'termination_date']);

function normalizeDate(val) {
  if (!val) return null;
  return String(val).split('T')[0];
}

function formatDiffValue(field, value) {
  if (value === null || value === undefined) return 'No disponible';
  if (DATE_FIELDS.has(field)) return formatDateLocal(value) ?? '-';
  if (field === 'club_pass_percentage') return `${parseFloat(value)}%`;
  return String(value);
}

function computeContractDiff(from, to) {
  const changes = [];

  for (const [field, label] of Object.entries(FIELD_LABELS)) {
    let fromVal = from[field];
    let toVal = to[field];

    if (DATE_FIELDS.has(field)) {
      fromVal = normalizeDate(fromVal);
      toVal = normalizeDate(toVal);
    } else if (field === 'club_pass_percentage' || field === 'estimated_salary') {
      fromVal = fromVal != null ? parseFloat(fromVal) : null;
      toVal = toVal != null ? parseFloat(toVal) : null;
    }

    if (fromVal !== toVal) {
      changes.push({ type: 'scalar', field, label, from: formatDiffValue(field, fromVal), to: formatDiffValue(field, toVal) });
    }
  }

  const fromClauses = from.clauses || [];
  const toClauses = to.clauses || [];
  const addedClauses = toClauses.filter((c) => !fromClauses.includes(c));
  const removedClauses = fromClauses.filter((c) => !toClauses.includes(c));
  if (addedClauses.length > 0 || removedClauses.length > 0) {
    changes.push({ type: 'array', label: 'Cláusulas', added: addedClauses, removed: removedClauses });
  }

  const fromLoan = from.loan;
  const toLoan = to.loan;
  if (!fromLoan && toLoan) {
    changes.push({ type: 'scalar', field: 'loan', label: 'Préstamo', from: 'Sin préstamo', to: `Cedido a ${toLoan.club}` });
  } else if (fromLoan && !toLoan) {
    changes.push({ type: 'scalar', field: 'loan', label: 'Préstamo', from: `Cedido a ${fromLoan.club}`, to: 'Sin préstamo' });
  } else if (fromLoan && toLoan) {
    if (fromLoan.club !== toLoan.club) {
      changes.push({ type: 'scalar', field: 'loan.club', label: 'Club de préstamo', from: fromLoan.club, to: toLoan.club });
    }
    const fromUntil = normalizeDate(fromLoan.until);
    const toUntil = normalizeDate(toLoan.until);
    if (fromUntil !== toUntil) {
      changes.push({ type: 'scalar', field: 'loan.until', label: 'Hasta (préstamo)', from: formatDateLocal(fromUntil) ?? '-', to: formatDateLocal(toUntil) ?? '-' });
    }
    const fromLC = fromLoan.clauses || [];
    const toLC = toLoan.clauses || [];
    const addedLC = toLC.filter((c) => !fromLC.includes(c));
    const removedLC = fromLC.filter((c) => !toLC.includes(c));
    if (addedLC.length > 0 || removedLC.length > 0) {
      changes.push({ type: 'array', label: 'Cláusulas del préstamo', added: addedLC, removed: removedLC });
    }
  }

  return changes;
}

export default function ContractDetailPage() {
  const { id } = useParams();
  const [contract, setContract] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getContract(id)
      .then((contractRes) => {
        setContract(contractRes.data.data);
        setHistory(contractRes.data.history || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const metaTitle = contract
    ? `Contrato de ${contract.full_name} en Boca Juniors | Números Boca Juniors`
    : null;

  const metaDescription = contract
    ? (() => {
        const salary = contract.estimated_salary
          ? new Intl.NumberFormat('es-AR', {
              style: 'currency',
              currency: contract.currency || 'USD',
              maximumFractionDigits: 0,
            }).format(contract.estimated_salary)
          : null;
        const parts = [`Contrato de ${contract.full_name} en el Club Atlético Boca Juniors.`];
        if (salary) parts.push(`Salario estimado: ${salary}.`);
        if (contract.expiration_date) parts.push(`Vencimiento: ${formatDate(contract.expiration_date)}.`);
        parts.push('Datos en Números Boca Juniors.');
        return parts.join(' ');
      })()
    : null;

  const structuredData = useMemo(() => {
    if (!contract) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `Contrato de ${contract.full_name} en Boca Juniors`,
      description: metaDescription,
      url: `https://www.numerosbocajuniors.net/contratos/${id}`,
      dateModified: contract.updated_at,
      publisher: {
        '@type': 'Organization',
        name: 'Números Boca Juniors',
        url: 'https://www.numerosbocajuniors.net',
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `https://www.numerosbocajuniors.net/contratos/${id}`,
      },
      about: {
        '@type': 'Person',
        name: contract.full_name,
      },
    };
  }, [contract, id, metaDescription]);

  usePageMeta({
    title: metaTitle,
    description: metaDescription,
    path: `/contratos/${id}`,
    structuredData,
  });

  if (loading) return <Loader />;
  if (!contract) return <p className="text-center py-12 text-gray-500">No encontrado.</p>;

  const effectiveEnd = contract.termination_date || contract.expiration_date;
  const vencido = new Date(effectiveEnd) < new Date();
  const rescindido = !!contract.termination_date;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/contratos" className="text-azul text-sm hover:underline mb-4 inline-block">
        &larr; Volver a contratos
      </Link>

      <div className="card">
        <div className="flex items-center gap-3 mb-2">
          {contract.links?.some((l) => l.official) && <OfficialBadge />}
          {rescindido && <span className="text-xs font-semibold text-red-600">Rescindido</span>}
          {!rescindido && vencido && <span className="text-xs font-semibold text-red-600">Vencido</span>}
        </div>

        <h1 className="text-xl font-bold mb-2">{contract.full_name}</h1>

        {(() => {
          const url = `https://www.numerosbocajuniors.net/contratos/${id}`;
          const salary = contract.estimated_salary
            ? new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: contract.currency || 'USD',
                maximumFractionDigits: 0,
              }).format(contract.estimated_salary)
            : null;
          const waText = salary
            ? `Mirá el contrato de ${contract.full_name} en Boca Juniors: cobra ${salary} estimado. Datos en Números Boca Juniors 👉 ${url}`
            : `Mirá el contrato de ${contract.full_name} en Boca Juniors. Datos en Números Boca Juniors 👉 ${url}`;
          const xText = salary
            ? `Contrato de ${contract.full_name} (Boca Juniors): salario estimado ${salary}. Vía @NumerosAzules 👉 ${url}`
            : `Contrato de ${contract.full_name} (Boca Juniors). Vía @NumerosAzules 👉 ${url}`;
          return (
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-gray-400">Compartir</span>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
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
                href={`https://x.com/intent/tweet?text=${encodeURIComponent(xText)}`}
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
          );
        })()}

        {contract.loan && (
          <div className="mb-6 p-4 bloque-prestamo">
            <p className="bloque-prestamo-titulo mb-3">
              Cedido a préstamo en {contract.loan.club}
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {contract.loan.until && (
                <div>
                  <p className="text-gray-500 text-xs">Finalización del préstamo</p>
                  <p className="font-medium">{formatDate(contract.loan.until)}</p>
                </div>
              )}
            </div>
            {contract.loan.clauses?.length > 0 && (
              <div className="mt-3">
                <p className="text-gray-500 text-xs mb-1">Cláusulas del préstamo</p>
                <ul className="space-y-1">
                  {contract.loan.clauses.map((clause, i) => (
                    <li key={i} className="text-sm bg-white px-3 py-2 rounded border border-blue-100">{clause}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          {contract.signing_date && (
            <div>
              <p className="text-gray-500">Fecha de firma</p>
              <p className="font-medium">{formatDate(contract.signing_date)}</p>
            </div>
          )}
          <div>
            <p className="text-gray-500">Fecha de vencimiento</p>
            <p className={`font-medium ${!rescindido && vencido ? 'text-red-600' : ''}`}>
              {formatDate(contract.expiration_date)}
            </p>
          </div>
          {rescindido && (
            <div>
              <p className="text-gray-500">Fecha de rescisión</p>
              <p className={`font-medium ${vencido ? 'text-red-600' : 'text-amber-600'}`}>
                {formatDate(contract.termination_date)}
              </p>
            </div>
          )}
          <div>
            <p className="text-gray-500">Porcentaje del pase</p>
            <p className="font-mono font-bold text-lg">{contract.club_pass_percentage}%</p>
          </div>
          <div>
            <p className="text-gray-500">Salario estimado</p>
            <p className="font-mono font-bold text-lg">
              {contract.estimated_salary
                ? new Intl.NumberFormat('es-AR', {
                    style: 'currency',
                    currency: contract.currency || 'USD',
                    maximumFractionDigits: 0,
                  }).format(contract.estimated_salary)
                : 'No disponible'}
            </p>
          </div>
        </div>

        {(() => {
          const allClauses = [
            ...(contract.clauses || []),
            ...(contract.loan?.clauses || []),
          ];
          return allClauses.length > 0 ? (
            <div className="mb-6">
              <p className="text-gray-500 text-sm mb-2">Clausulas</p>
              <ul className="space-y-1">
                {allClauses.map((c, i) => (
                  <li key={i} className="text-sm bg-gray-50 px-3 py-2 rounded">{c}</li>
                ))}
              </ul>
            </div>
          ) : null;
        })()}

        {contract.links && contract.links.length > 0 && (
          <div>
            <p className="text-gray-500 text-sm mb-2">Fuentes</p>
            <ul className="space-y-1">
              {contract.links.map((link, i) => (
                <li key={i} className="flex items-center gap-2">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-azul text-sm hover:underline">
                    <SourceLabel url={link.url} />
                  </a>
                  {link.official && <OfficialBadge />}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="card mt-4">
          <h2 className="text-base font-bold mb-4">Historial de modificaciones</h2>
          {[...history].reverse().map((snapshot, idx, arr) => {
            const nextVersion = idx === 0 ? contract : arr[idx - 1];
            const changes = computeContractDiff(snapshot, nextVersion);
            if (changes.length === 0) return null;
            return (
              <div key={snapshot.id} className="border-l-2 border-gray-200 pl-4 mb-5 last:mb-0">
                <p className="text-xs text-gray-400 mb-2">
                  Cambio registrado el {formatDate(snapshot.created_at)}
                </p>
                <ul className="space-y-1">
                  {changes.map((change, i) => (
                    <li key={i} className="text-sm">
                      {change.type === 'scalar' && (
                        <span>
                          <span className="font-medium text-gray-700">{change.label}:</span>
                          {' '}
                          <span className="text-red-500 line-through">{change.from}</span>
                          {' → '}
                          <span className="text-green-600">{change.to}</span>
                        </span>
                      )}
                      {change.type === 'array' && (
                        <div>
                          <span className="font-medium text-gray-700">{change.label}:</span>
                          {change.added?.map((item, j) => (
                            <p key={`a${j}`} className="ml-3 text-green-600">+ {item}</p>
                          ))}
                          {change.removed?.map((item, j) => (
                            <p key={`r${j}`} className="ml-3 text-red-500 line-through">- {item}</p>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
