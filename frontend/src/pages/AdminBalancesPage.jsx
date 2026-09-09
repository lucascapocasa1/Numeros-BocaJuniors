import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getBalances, deleteBalance } from '../api/endpoints';
import Loader from '../components/common/Loader';
import SectionEnableToggle from '../components/admin/SectionEnableToggle';
import BalanceChartDefaultItems from '../components/admin/BalanceChartDefaultItems';

export default function AdminBalancesPage() {
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchBalances = useCallback(() => {
    setLoading(true);
    getBalances()
      .then((res) => setBalances(res.data?.data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este balance?')) return;
    await deleteBalance(id);
    fetchBalances();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <SectionEnableToggle settingKey="section_balances_enabled" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/admin" className="text-azul text-sm hover:underline">&larr; Admin</Link>
          <h1 className="text-2xl font-extrabold">Balances</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/admin/balances/nuevo')}
            className="btn-primary text-sm"
          >
            + Nuevo balance
          </button>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : balances.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          No hay balances cargados aún.
          <div className="mt-4">
            <button onClick={() => navigate('/admin/balances/nuevo')} className="btn-primary text-sm">
              Cargar primer balance
            </button>
          </div>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500 uppercase">
                <th className="pb-3 pr-4">ID</th>
                <th className="pb-3 pr-4">Ejercicio</th>
                <th className="pb-3 pr-4">Publicación</th>
                <th className="pb-3 pr-4 text-right">Dólar referencia</th>
                <th className="pb-3 pr-4">Archivo</th>
                <th className="pb-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((b) => (
                <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-4 text-gray-400">{b.id}</td>
                  <td className="py-2 pr-4 font-bold">{b.exercise}</td>
                  <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{b.published_at || '-'}</td>
                  <td className="py-2 pr-4 text-right font-mono text-gray-600">
                    {b.dollar_reference ? `$ ${Number(b.dollar_reference).toLocaleString('es-AR')}` : '-'}
                  </td>
                  <td className="py-2 pr-4">
                    {b.has_file ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700 font-medium">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        {b.file_original_name || 'Archivo'}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Sin archivo</span>
                    )}
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <button
                      onClick={() => navigate(`/admin/balances/${b.id}/editar`)}
                      className="text-blue-600 text-xs mr-3 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="text-red-600 text-xs hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <BalanceChartDefaultItems />
    </div>
  );
}
