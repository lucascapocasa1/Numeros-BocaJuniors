import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getElectionByToken, getElectionListLogoUrl } from '../api/endpoints';
import { usePageMeta } from '../hooks/usePageMeta';
import Loader from '../components/common/Loader';
import ElectionListContent from '../components/ElectionListContent';

export default function ElectionListPage() {
  const { token } = useParams();
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    getElectionByToken(token)
      .then((res) => setList(res.data.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  usePageMeta({
    title: list ? `${list.name} | Elecciones | Números Azules` : 'Elecciones | Números Azules',
    description: list ? `Candidatos, propuestas y compromisos de ${list.name}.` : null,
    path: `/elecciones/privado/${token}`,
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
      <div className="flex items-center gap-3 mb-6">
        {list.has_logo ? (
          <img
            src={getElectionListLogoUrl(list.id)}
            alt={list.name}
            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-gray-100 flex-shrink-0" />
        )}
        <div>
          <h1 className="text-xl font-extrabold leading-tight">{list.name}</h1>
          <p className="text-xs text-gray-400">Vista de validación — enlace privado, no listado públicamente.</p>
        </div>
      </div>

      <div className="card">
        <ElectionListContent list={list} showNoCommitmentsReason />
      </div>
    </div>
  );
}
