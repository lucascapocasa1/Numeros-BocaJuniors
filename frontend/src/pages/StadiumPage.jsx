import { useState, useEffect } from 'react';
import { getStadium } from '../api/endpoints';
import { usePageMeta } from '../hooks/usePageMeta';
import Loader from '../components/common/Loader';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatPrice(price, currency) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency || 'ARS',
    maximumFractionDigits: 0,
  }).format(price);
}

function isPast(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  return d < today;
}

export default function StadiumPage() {
  const [loading, setLoading] = useState(true);
  const [stadium, setStadium] = useState(null);
  const [matches, setMatches] = useState([]);
  const [showPast, setShowPast] = useState(false);

  usePageMeta({
    title: 'Estadio Alberto J. Armando (La Bombonera) | Números Azules',
    description: 'Capacidad, sectores y datos del Estadio Alberto J. Armando (La Bombonera) del Club Atlético Boca Juniors.',
    path: '/estadio',
  });

  useEffect(() => {
    getStadium()
      .then((res) => {
        const data = res.data?.data || {};
        setStadium(data.stadium || null);
        // Sort matches: upcoming first, then past
        const sorted = (data.matches || []).sort((a, b) => {
          return new Date(b.match_date) - new Date(a.match_date);
        });
        setMatches(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const upcomingMatches = matches.filter((m) => !isPast(m.match_date));
  const pastMatches = matches.filter((m) => isPast(m.match_date));
  const displayedMatches = showPast ? [...upcomingMatches, ...pastMatches] : upcomingMatches;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Loader />
      </div>
    );
  }

  if (!stadium) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">
        <p>No hay información del estadio disponible.</p>
      </div>
    );
  }

  const totalCapacity = (stadium.sectors || []).reduce((sum, s) => sum + (s.capacity || 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{stadium.name}</h1>
        <div className="flex flex-wrap gap-4 mt-2">
          {totalCapacity > 0 && (
            <span className="text-sm text-gray-500">
              Capacidad total:{' '}
              <strong className="text-gray-800">{totalCapacity.toLocaleString('es-AR')} personas</strong>
            </span>
          )}
          {stadium.link && (
            <a
              href={stadium.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-azul hover:underline font-medium"
            >
              Más información →
            </a>
          )}
        </div>
      </div>

      {/* Sectors */}
      {stadium.sectors && stadium.sectors.length > 0 && (
        <div className="card mb-6">
          <h2 className="text-base font-bold mb-3">Sectores</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2 pr-4">Sector</th>
                  <th className="pb-2 text-right">Capacidad</th>
                </tr>
              </thead>
              <tbody>
                {stadium.sectors.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-4 font-medium">{s.name}</td>
                    <td className="py-2 text-right font-mono text-gray-600">
                      {s.capacity !== null && s.capacity !== undefined
                        ? s.capacity.toLocaleString('es-AR')
                        : '-'}
                    </td>
                  </tr>
                ))}
                {totalCapacity > 0 && (
                  <tr className="bg-gray-50">
                    <td className="py-2 pr-4 font-bold text-xs uppercase text-gray-500">Total</td>
                    <td className="py-2 text-right font-bold font-mono">
                      {totalCapacity.toLocaleString('es-AR')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Matches */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Partidos</h2>
          {pastMatches.length > 0 && (
            <button
              onClick={() => setShowPast(!showPast)}
              className="text-sm text-azul hover:underline"
            >
              {showPast ? 'Ocultar anteriores' : `Ver anteriores (${pastMatches.length})`}
            </button>
          )}
        </div>

        {displayedMatches.length === 0 ? (
          <div className="card text-center py-10 text-gray-500">
            <p className="text-sm">No hay partidos cargados.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedMatches.map((m) => {
              const past = isPast(m.match_date);
              return (
                <div
                  key={m.id}
                  className={`card ${past ? 'opacity-60' : ''}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900">
                          {m.is_home ? 'Boca Juniors' : m.opponent} vs{' '}
                          {m.is_home ? m.opponent : 'Boca Juniors'}
                        </h3>
                        <span
                          className={m.is_home ? 'badge-local' : 'badge-visitante'}
                        >
                          {m.is_home ? 'Local' : 'Visitante'}
                        </span>
                        {past && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                            Finalizado
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 capitalize">
                        {formatDate(m.match_date)}
                        {m.match_time && (
                          <span className="ml-2 font-mono text-xs">{m.match_time.slice(0, 5)}hs</span>
                        )}
                      </p>
                      {m.competition && (
                        <p className="text-xs text-gray-400 mt-0.5">{m.competition}</p>
                      )}
                    </div>
                  </div>

                  {m.prices && m.prices.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Precios de entradas</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {m.prices.map((p) => (
                          <div key={p.id} className="bg-gray-50 rounded-lg px-3 py-2">
                            <p className="text-xs text-gray-500">{p.sector?.name || '-'}</p>
                            <p className="font-bold text-gray-900 text-sm">{formatPrice(p.price, p.currency)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Sin precios de entradas cargados</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
