import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAdminElections, deleteElectionList, getElectionListLogoUrl } from '../api/endpoints';
import Loader from '../components/common/Loader';
import SectionEnableToggle from '../components/admin/SectionEnableToggle';

export default function AdminElectionsPage() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const navigate = useNavigate();

  const fetchData = () => {
    setLoading(true);
    getAdminElections()
      .then((res) => setLists(res.data.data || []))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, []);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta lista y todos sus candidatos y propuestas?')) return;
    await deleteElectionList(id);
    fetchData();
  };

  const handleCopyLink = async (l) => {
    const url = `${window.location.origin}/elecciones/${l.token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copiá el enlace:', url);
    }
    setCopiedId(l.id);
    setTimeout(() => setCopiedId((current) => (current === l.id ? null : current)), 1500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <SectionEnableToggle settingKey="section_elecciones_enabled" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/admin" className="text-azul text-sm hover:underline">&larr; Admin</Link>
          <h1 className="text-2xl font-extrabold">Elecciones</h1>
        </div>
        <button onClick={() => navigate('/admin/elecciones/nuevo')} className="btn-primary text-sm">
          + Nueva lista
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500 uppercase">
                <th className="pb-3 pr-4">Logo</th>
                <th className="pb-3 pr-4">Lista</th>
                <th className="pb-3 pr-4">Candidatos</th>
                <th className="pb-3 pr-4">Propuestas</th>
                <th className="pb-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lists.map((l) => (
                <tr key={l.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4">
                    {l.has_logo ? (
                      <img src={getElectionListLogoUrl(l.id)} alt={l.name} className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 font-medium">{l.name}</td>
                  <td className="py-2 pr-4 text-gray-500">{l.candidates?.length ?? 0}</td>
                  <td className="py-2 pr-4 text-gray-500">{l.proposals?.length ?? 0}</td>
                  <td className="py-2 whitespace-nowrap">
                    <button
                      onClick={() => navigate(`/admin/elecciones/${l.id}/editar`)}
                      className="text-blue-600 text-xs mr-3 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleCopyLink(l)}
                      className="text-gray-500 text-xs mr-3 hover:underline"
                    >
                      {copiedId === l.id ? '¡Copiado!' : 'Copiar link de validación'}
                    </button>
                    <button
                      onClick={() => handleDelete(l.id)}
                      className="text-red-600 text-xs hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {lists.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">
                    No hay listas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
