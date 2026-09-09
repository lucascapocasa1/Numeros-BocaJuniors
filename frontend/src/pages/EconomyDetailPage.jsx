import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getEconomyRecord } from '../api/endpoints';
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

export default function EconomyDetailPage() {
  const { id } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEconomyRecord(id)
      .then((res) => {
        const r = res.data.data;
        setRecord(r);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const metaTitle = record
    ? `${record.description} | Números Azules`
    : null;

  const metaDescription = record
    ? (() => {
        const amount = new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: record.currency,
          maximumFractionDigits: 0,
        }).format(record.amount);
        const tipo = record.type === 'cobro' ? 'Cobro' : 'Pago';
        const parts = [`${tipo} de ${amount}`];
        if (record.entity) parts.push(`relacionado con ${record.entity}`);
        if (record.record_date) parts.push(`(${record.record_date})`);
        parts.push('— Club Atlético Boca Juniors. Datos en Números Azules.');
        return parts.join(' ');
      })()
    : null;

  const structuredData = useMemo(() => {
    if (!record) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: record.description,
      description: metaDescription,
      url: `https://www.numerosazules.net/economia/${id}`,
      dateModified: record.updated_at,
      publisher: {
        '@type': 'Organization',
        name: 'Números Azules',
        url: 'https://www.numerosazules.net',
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `https://www.numerosazules.net/economia/${id}`,
      },
    };
  }, [record, id, metaDescription]);

  usePageMeta({
    title: metaTitle,
    description: metaDescription,
    path: `/economia/${id}`,
    structuredData,
  });

  if (loading) return <Loader />;
  if (!record) return <p className="text-center py-12 text-gray-500">No encontrado.</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/economia" className="text-azul text-sm hover:underline mb-4 inline-block">
        &larr; Volver a economia
      </Link>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <span className={record.type === 'cobro' ? 'badge-cobro' : 'badge-pago'}>
            {record.type}
          </span>
          {record.links?.some((l) => l.official) && <OfficialBadge />}
          {record.carried_out_date && <span className="text-xs font-semibold text-ingreso">Confirmado el {formatDate(record.carried_out_date)}</span>}
        </div>

        <h1 className="text-xl font-bold mb-2">{record.description}</h1>

        {(() => {
          const url = `https://www.numerosazules.net/economia/${id}`;
          const monto = new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: record.currency,
            maximumFractionDigits: 0,
          }).format(record.amount);
          const tipo = record.type === 'cobro' ? 'Cobro' : 'Pago';
          const waText = `${tipo} de Boca Juniors: ${record.description} — ${monto}. Datos en Números Azules 👉 ${url}`;
          const xText = `${tipo} de Boca Juniors: ${record.description} (${monto}). Vía @NumerosAzules 👉 ${url}`;
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

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Monto</p>
            <p className="font-mono font-bold text-lg">
              {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: record.currency,
                maximumFractionDigits: 0,
              }).format(record.amount)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Fecha</p>
            <p className="font-medium">{formatDate(record.record_date) || 'Sin fecha'}</p>
          </div>
        </div>

        {record.entity && (
          <div className="mt-4">
            <p className="text-gray-500 text-sm">Entidad</p>
            <p className="font-medium">{record.entity}</p>
          </div>
        )}

        {record.comments && (
          <div className="mt-4">
            <p className="text-gray-500 text-sm">Comentarios</p>
            <p className="text-sm">{record.comments}</p>
          </div>
        )}

        {record.links && record.links.length > 0 && (
          <div className="mt-6">
            <p className="text-gray-500 text-sm mb-2">Fuentes</p>
            <ul className="space-y-1">
              {record.links.map((link, i) => (
                <li key={i} className="flex items-center gap-2">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-azul text-sm hover:underline"
                  >
                    <SourceLabel url={link.url} />
                  </a>
                  {link.official && <OfficialBadge />}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
