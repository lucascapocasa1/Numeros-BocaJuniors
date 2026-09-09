import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getEconomyRecords, deleteEconomyRecord } from '../api/endpoints';
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

export default function AdminEconomyPage() {
  const [data, setData] = useState({ data: [], meta: null });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterUnconfirmed, setFilterUnconfirmed] = useState(false);
  const [filterOverdue, setFilterOverdue] = useState(false);
  const debounceRef = useRef(null);
  const navigate = useNavigate();

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  };

  const fetchData = () => {
    setLoading(true);
    const params = { page, per_page: 20 };
    if (debouncedSearch) params.search = debouncedSearch;
    if (filterUnconfirmed) params.carried_out = 0;
    if (filterOverdue) params.overdue = 1;
    getEconomyRecords(params)
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, [page, debouncedSearch, filterUnconfirmed, filterOverdue]);

  const toggleFilter = (setter) => {
    setter((prev) => !prev);
    setPage(1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminar este registro?')) return;
    await deleteEconomyRecord(id);
    fetchData();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <SectionEnableToggle settingKey="section_economia_enabled" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/admin" className="text-azul text-sm hover:underline">&larr; Admin</Link>
          <h1 className="text-2xl font-extrabold">Economia</h1>
        </div>
        <button onClick={() => navigate('/admin/economia/nuevo')} className="btn-primary text-sm">
          + Nuevo registro
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Buscar por descripción..."
          className="w-full sm:w-96 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-azul"
        />
        <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterUnconfirmed}
            onChange={() => toggleFilter(setFilterUnconfirmed)}
            className="rounded border-gray-300 text-azul focus:ring-azul"
          />
          Sin confirmar
        </label>
        <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterOverdue}
            onChange={() => toggleFilter(setFilterOverdue)}
            className="rounded border-gray-300 text-azul focus:ring-azul"
          />
          Vencidos
        </label>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500 uppercase">
                <th className="pb-3 pr-4">ID</th>
                <th className="pb-3 pr-4">Fecha</th>
                <th className="pb-3 pr-4">Descripcion</th>
                <th className="pb-3 pr-4">Tipo</th>
                <th className="pb-3 pr-4 text-right">Monto</th>
                <th className="pb-3 pr-4">Efectuado</th>
                <th className="pb-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((r) => (
                <tr key={r.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-400">{r.id}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{formatDate(r.record_date)}</td>
                  <td className="py-2 pr-4">
                    {r.description.length > 50 ? r.description.slice(0, 50) + '...' : r.description}
                  </td>
                  <td className="py-2 pr-4 uppercase text-xs font-semibold">{r.type}</td>
                  <td className="py-2 pr-4 text-right font-mono">
                    {r.currency} {Number(r.amount).toLocaleString('es-AR')}
                  </td>
                  <td className="py-2 pr-4">
                    {r.carried_out_date ? (
                      <span className="text-ingreso text-xs font-semibold">{formatDate(r.carried_out_date)}</span>
                    ) : (
                      <span className="text-gray-400 text-xs">No</span>
                    )}
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <button
                      onClick={() => navigate(`/admin/economia/${r.id}/editar`)}
                      className="text-blue-600 text-xs mr-3 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
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
