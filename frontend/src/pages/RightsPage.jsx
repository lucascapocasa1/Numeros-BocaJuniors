import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getRights } from '../api/endpoints';
import { usePageMeta } from '../hooks/usePageMeta';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import Pagination from '../components/common/Pagination';
import PlayerAvatar from '../components/PlayerAvatar';
import OfficialBadge from '../components/OfficialBadge';
import SourceLabel from '../components/SourceLabel';
import { translatePosition } from '../utils/positions';

function RightCard({ player }) {
  const isArgentine = player.country?.toLowerCase?.()?.includes('argentin');
  const contratado = player.status === 'contratado';
  const positions = Array.isArray(player.positions) ? player.positions : [];

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <PlayerAvatar src={player.player_avatar} alt={player.full_name} />
          {player.country_flag && !isArgentine && (
            <img
              src={player.country_flag}
              alt=""
              className="absolute -bottom-0.5 -right-0.5 w-4 h-3 object-cover rounded-sm border border-white"
            />
          )}
        </div>
        <div className="overflow-hidden flex-1">
          <p className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">
            {player.full_name}
          </p>
          {player.current_team_name && (
            <p className="text-xs text-gray-500 truncate">{player.current_team_name}</p>
          )}
          {positions.length > 0 && (
            <div className="text-xs text-gray-400 mt-0.5">
              {positions.map((p, i) => (
                <p key={i}>{translatePosition(p.pos)}</p>
              ))}
            </div>
          )}
          {contratado && (
            <span className="inline-block mt-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
              Contratado
            </span>
          )}
        </div>
      </div>

      {Array.isArray(player.clauses) && player.clauses.length > 0 && (
        <div className="pt-1 border-t border-gray-100 flex-1">
          <p className="text-xs text-gray-400 mb-1">Cláusulas</p>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {player.clauses.map((clause, i) => (
              <li key={i} className="bg-gray-50 px-2 py-1 rounded break-words">{clause}</li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(player.links) && player.links.length > 0 && (
        <div className="pt-1 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Fuentes</p>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {player.links.map((link, i) => (
              <li key={i} className="flex items-center gap-1">
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-azul hover:underline truncate">
                  <SourceLabel url={link.url} />
                </a>
                {link.official && <OfficialBadge />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function RightsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [data, setData] = useState({ data: [], meta: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  usePageMeta({
    title: 'Derechos sobre jugadores de Boca Juniors | Números Azules',
    description: 'Derechos económicos del Club Atlético Boca Juniors sobre sus jugadores: porcentajes del pase, cláusulas y fuentes. No incluye derechos de formación.',
    path: '/derechos',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (page > 1) params.page = String(page);
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, page]);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = { per_page: 20 };
    if (debouncedSearch) params.search = debouncedSearch;
    if (page > 1) params.page = page;
    getRights(params)
      .then((res) => setData(res.data))
      .catch(() => setError('No se pudieron cargar los datos. Intentá de nuevo.'))
      .finally(() => setLoading(false));
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo(0, 0);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-extrabold mb-1">Derechos sobre jugadores</h1>
      <p className="text-xs text-gray-400 mb-3">No incluye derechos de formación</p>

      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs text-gray-400">Compartir</span>
        <a
          href={`https://wa.me/?text=${encodeURIComponent('¡Mirá los derechos económicos que tiene Boca Juniors sobre sus jugadores! Datos en Números Azules 👉 ' + window.location.href)}`}
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
          href={`https://x.com/intent/tweet?text=${encodeURIComponent('Los derechos económicos de Boca Juniors sobre sus jugadores, con detalle por cada uno. Vía @NumerosAzules 👉 ' + window.location.href)}`}
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

      <form onSubmit={(e) => e.preventDefault()} className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar jugador por nombre..."
          className="input-field w-full max-w-sm"
        />
      </form>

      {loading ? (
        <Loader />
      ) : error ? (
        <div className="card">
          <ErrorMessage message={error} onRetry={fetchData} />
        </div>
      ) : data.data.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          {debouncedSearch
            ? `No se encontraron jugadores con "${debouncedSearch}"`
            : 'No hay derechos registrados.'}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{data.meta?.total ?? data.data.length} jugadores</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {data.data.map((r) => (
              <RightCard key={r.id} player={r} />
            ))}
          </div>
          <Pagination meta={data.meta} onPageChange={handlePageChange} />
        </>
      )}
    </div>
  );
}
