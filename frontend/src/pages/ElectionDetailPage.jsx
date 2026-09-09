import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getElectionBySlug, getElectionListLogoUrl } from '../api/endpoints';
import { usePageMeta } from '../hooks/usePageMeta';
import Loader from '../components/common/Loader';
import ElectionListContent from '../components/ElectionListContent';

export default function ElectionDetailPage() {
  const { slug } = useParams();
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    getElectionBySlug(slug)
      .then((res) => setList(res.data.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  usePageMeta({
    title: list ? `${list.name} | Elecciones | Números Azules` : 'Elecciones | Números Azules',
    description: list ? `Candidatos, propuestas, compromisos y metas de ${list.name} para las elecciones de Boca Juniors.` : null,
    path: `/elecciones/${slug}`,
  });

  if (loading) return <Loader />;

  if (notFound || !list) {
    return (
      <p className="text-center py-12 text-gray-500">
        No encontramos esta lista. Verificá el enlace.
      </p>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        {list.has_logo ? (
          <img
            src={getElectionListLogoUrl(list.id)}
            alt={list.name}
            className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-24 h-24 rounded-lg bg-gray-100 flex-shrink-0" />
        )}
        <h1 className="text-xl font-extrabold leading-tight">{list.name}</h1>
      </div>

      <div className="card">
        <ElectionListContent list={list} />
      </div>
    </div>
  );
}
