import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getElections, getElectionListLogoUrl } from '../api/endpoints';
import { usePageMeta } from '../hooks/usePageMeta';
import Loader from '../components/common/Loader';
import ElectionMethodologyModal from '../components/ElectionMethodologyModal';

export default function ElectionsPage() {
  const [electionLists, setElectionLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMethodology, setShowMethodology] = useState(false);

  usePageMeta({
    title: 'Elecciones de Boca Juniors | Números Boca Juniors',
    description: 'Las listas que se postulan en las elecciones de Boca Juniors: candidatos, propuestas, compromisos y metas verificables, analizados con el mismo criterio para todas.',
    path: '/elecciones',
  });

  useEffect(() => {
    setLoading(true);
    getElections()
      .then((res) => {
        const shuffled = [...(res.data.data || [])];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setElectionLists(shuffled);
      })
      .catch(() => setElectionLists([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <ElectionMethodologyModal open={showMethodology} onClose={() => setShowMethodology(false)} />

      <h1 className="text-2xl font-extrabold mb-1">Elecciones</h1>

      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-gray-400">Compartir</span>
        <a
          href={`https://wa.me/?text=${encodeURIComponent('¡Mirá las listas, candidatos y propuestas para las elecciones de Boca Juniors! Todo en Números Boca Juniors 👉 ' + window.location.href)}`}
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
          href={`https://x.com/intent/tweet?text=${encodeURIComponent('Las listas, candidatos y propuestas para las elecciones de Boca Juniors. Vía @NumerosAzules 👉 ' + window.location.href)}`}
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

      <p className="text-sm text-gray-500 mb-1">Las listas que se postulan, sus candidatos, propuestas, compromisos y metas</p>
      <button
        type="button"
        onClick={() => setShowMethodology(true)}
        className="text-xs text-azul hover:underline font-medium mb-6 inline-flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M18 10A8 8 0 112 10a8 8 0 0116 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9zm1-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
        </svg>
        Metodología
      </button>

      {loading ? (
        <div className="py-12">
          <Loader />
        </div>
      ) : electionLists.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No hay listas registradas.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {electionLists.map((l) => (
            <Link
              key={l.id}
              to={`/elecciones/${l.slug}`}
              className="flex flex-col items-center text-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-azul/40 hover:shadow-sm transition-all bg-white"
            >
              {l.has_logo ? (
                <img src={getElectionListLogoUrl(l.id)} alt={l.name} className="w-24 h-24 rounded-lg object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-gray-100" />
              )}
              <p className="text-sm font-semibold leading-tight">{l.name}</p>
              <p className="text-xs text-gray-400">{(l.candidates || []).length} candidatos</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
