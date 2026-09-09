import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getBalances } from '../api/endpoints';
import { usePageMeta } from '../hooks/usePageMeta';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import BalanceLineChart from '../components/balances/BalanceLineChart';
import BalanceComparisonTable from '../components/balances/BalanceComparisonTable';

export default function BalancesPage() {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchBalances = useCallback(() => {
    setLoading(true);
    setError(null);
    getBalances()
      .then((res) => {
        const list = res.data?.data || [];
        setBalances(list);
        if (list.length > 0) {
          const latest = list.reduce((max, b) => (b.created_at > max ? b.created_at : max), list[0].created_at);
          setLastUpdated(new Date(latest).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }));
        }
      })
      .catch(() => setError('No se pudieron cargar los balances. Intentá de nuevo.'))
      .finally(() => setLoading(false));
  }, []);

  usePageMeta({
    title: 'Balances oficiales de Boca Juniors | Números Azules',
    description: 'Balances patrimoniales y estados contables oficiales del Club Atlético Boca Juniors. Evolución histórica y desglose detallado.',
    path: '/balances',
  });

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-extrabold mb-1">Balances oficiales</h1>
      {lastUpdated && (
        <p className="text-xs text-gray-400 mb-1">Última actualización: {lastUpdated}</p>
      )}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-400">Compartir</span>
        <a
          href="https://wa.me/?text=Mir%C3%A1%20los%20balances%20oficiales%20de%20Boca%20Juniors%3A%20https%3A%2F%2Fwww.numerosazules.net%2Fbalances"
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
          href="https://x.com/intent/tweet?text=Mir%C3%A1%20los%20balances%20oficiales%20de%20Boca%20Juniors%3A%20https%3A%2F%2Fwww.numerosazules.net%2Fbalances"
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
      <p className="text-gray-500 text-sm mb-8">
        Documentos e información económica publicada oficialmente por el Club Atlético Boca Juniors.
      </p>
      <p className="text-gray-500 text-sm mb-8">
        Para los cálculos, se utiliza como dólar de referencia el valor oficial promedio del periódo del ejercicio.
      </p>

      {/* Evolution chart */}
      <div className="mb-8">
        <BalanceLineChart compact={false} showLink={false} />
      </div>

      {/* Comparison table */}
      {!loading && !error && balances.length >= 2 && (
        <BalanceComparisonTable allBalances={balances} />
      )}

      {/* Balances list */}
      <h2 className="text-xl font-bold mb-4">Documentos</h2>

      {loading ? (
        <Loader />
      ) : error ? (
        <div className="card">
          <ErrorMessage message={error} onRetry={fetchBalances} />
        </div>
      ) : balances.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          No hay balances publicados aún.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {balances.map((b) => (
            <Link
              key={b.id}
              to={`/balances/${b.id}`}
              className="card hover:shadow-md hover:border-azul/20 transition-all duration-200 flex items-center justify-between gap-4"
            >
              <div>
                <p className="font-extrabold text-lg text-azul">Ejercicio {b.exercise}</p>
                {b.published_at && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {new Date(b.published_at).toLocaleDateString('es-AR', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </p>
                )}
                {b.has_file && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium mt-1.5">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Documento disponible
                  </span>
                )}
              </div>
              <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
