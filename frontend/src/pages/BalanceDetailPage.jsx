import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBalance, getBalanceDownloadUrl } from '../api/endpoints';
import { usePageMeta } from '../hooks/usePageMeta';
import Loader from '../components/common/Loader';
import BalanceBreakdownTable from '../components/balances/BalanceBreakdownTable';

export default function BalanceDetailPage() {
  const { id } = useParams();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    getBalance(id)
      .then((res) => {
        const d = res.data?.data;
        setBalance(d);
      })
      .catch(() => setError('No se pudo cargar el balance.'))
      .finally(() => setLoading(false));
  }, [id]);

  const metaTitle = balance
    ? `Balance ${balance.exercise} de Boca Juniors | Números Azules`
    : null;

  const metaDescription = balance
    ? (() => {
        const parts = [`Balance patrimonial del ejercicio ${balance.exercise} del Club Atlético Boca Juniors.`];
        if (balance.published_at) {
          const fecha = new Date(balance.published_at).toLocaleDateString('es-AR', {
            day: '2-digit', month: 'long', year: 'numeric',
          });
          parts.push(`Publicado el ${fecha}.`);
        }
        parts.push('Datos en Números Azules.');
        return parts.join(' ');
      })()
    : null;

  const structuredData = useMemo(() => {
    if (!balance) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `Balance ${balance.exercise} del Club Atlético Boca Juniors`,
      description: metaDescription,
      url: `https://www.numerosazules.net/balances/${id}`,
      dateModified: balance.updated_at,
      publisher: {
        '@type': 'Organization',
        name: 'Números Azules',
        url: 'https://www.numerosazules.net',
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `https://www.numerosazules.net/balances/${id}`,
      },
    };
  }, [balance, id, metaDescription]);

  usePageMeta({
    title: metaTitle,
    description: metaDescription,
    path: `/balances/${id}`,
    structuredData,
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Loader />
      </div>
    );
  }

  if (error || !balance) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">
        {error || 'Balance no encontrado.'}
        <div className="mt-4">
          <Link to="/balances" className="text-azul hover:underline">Volver a Balances</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link to="/balances" className="text-azul text-sm hover:underline">&larr; Balances</Link>
        <h1 className="text-3xl font-extrabold mt-1">Balance {balance.exercise}</h1>
        {balance.fecha && (
          <p className="text-sm text-gray-500 mt-1">
            Ejercicio al {new Date(balance.fecha).toLocaleDateString('es-AR', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
          </p>
        )}
        {balance.published_at && (
          <p className="text-sm text-gray-500">
            Publicado el {new Date(balance.published_at).toLocaleDateString('es-AR', {
              day: '2-digit', month: 'long', year: 'numeric',
            })}
          </p>
        )}
        {balance.dollar_reference && (
          <p className="text-sm text-gray-500">
            Dólar de referencia: <strong>${Number(balance.dollar_reference).toLocaleString('es-AR')}</strong>
          </p>
        )}

        {/* Share buttons */}
        {(() => {
          const url = `https://www.numerosazules.net/balances/${id}`;
          const waText = `Mirá el balance oficial de Boca Juniors - Ejercicio ${balance.exercise}. Datos en Números Azules 👉 ${url}`;
          const xText = `Balance oficial de Boca Juniors - Ejercicio ${balance.exercise}. Vía @NumerosAzules 👉 ${url}`;
          return (
            <div className="flex items-center gap-2 mt-3">
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
      </div>

      {/* Download file card */}
      {balance.has_file && (
        <div className="card mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-800">Documento oficial del balance</p>
            <p className="text-sm text-gray-500">{balance.file_original_name}</p>
          </div>
          <a
            href={getBalanceDownloadUrl(id)}
            className="btn-primary flex items-center gap-2 text-sm"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Descargar
          </a>
        </div>
      )}

      {/* Lines tree */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Desglose del balance</h2>
        <BalanceBreakdownTable lines={balance.lines || []} />
      </div>
    </div>
  );
}
