import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getContracts, deleteContract } from '../api/endpoints';
import Loader from '../components/common/Loader';
import Pagination from '../components/common/Pagination';
import SectionEnableToggle from '../components/admin/SectionEnableToggle';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

export default function AdminContractsPage() {
  const [data, setData] = useState({ data: [], meta: null });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const fetchData = () => {
    setLoading(true);
    const params = { page, per_page: 20 };
    if (search) params.search = search;
    getContracts(params)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, [page, search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar este contrato?')) return;
    await deleteContract(id);
    fetchData();
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <SectionEnableToggle settingKey="section_contratos_enabled" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/admin" className="text-azul text-sm hover:underline">&larr; Admin</Link>
          <h1 className="text-2xl font-extrabold">Contratos</h1>
        </div>
        <button onClick={() => navigate('/admin/contratos/nuevo')} className="btn-primary text-sm">
          + Nuevo contrato
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Buscar por nombre de jugador..."
          className="input-field w-full max-w-sm"
        />
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500 uppercase">
                <th className="pb-3 pr-4">ID</th>
                <th className="pb-3 pr-4">Jugador</th>
                <th className="pb-3 pr-4">Vencimiento</th>
                <th className="pb-3 pr-4 text-right">% Pase</th>
                <th className="pb-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((c) => (
                <tr key={c.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-400">{c.id}</td>
                  <td className="py-2 pr-4 font-medium">{c.full_name}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{formatDate(c.expiration_date)}</td>
                  <td className="py-2 pr-4 text-right font-mono">{c.club_pass_percentage}%</td>
                  <td className="py-2 whitespace-nowrap">
                    <button
                      onClick={() => navigate(`/admin/contratos/${c.id}/editar`)}
                      className="text-blue-600 text-xs mr-3 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-red-600 text-xs hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={data.meta} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
