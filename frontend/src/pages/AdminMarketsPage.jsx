import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMarkets, createMarket, updateMarket, deleteMarket, activateMarket, deactivateMarket } from '../api/endpoints';
import Loader from '../components/common/Loader';

export default function AdminMarketsPage() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchMarkets = () => {
    setLoading(true);
    getMarkets()
      .then((res) => setMarkets(res.data.data || []))
      .catch(() => setMarkets([]))
      .finally(() => setLoading(false));
  };

  useEffect(fetchMarkets, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError('');
    try {
      await createMarket({ name: newName.trim() });
      setNewName('');
      fetchMarkets();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear el mercado');
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (market) => {
    setEditingId(market.id);
    setEditName(market.name);
  };

  const handleSaveEdit = async (id) => {
    if (!editName.trim()) return;
    setSaving(true);
    setError('');
    try {
      await updateMarket(id, { name: editName.trim() });
      setEditingId(null);
      fetchMarkets();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este mercado? Los rumores asociados quedarán sin mercado.')) return;
    try {
      await deleteMarket(id);
      fetchMarkets();
    } catch {
      setError('Error al eliminar');
    }
  };

  const handleActivate = async (id) => {
    try {
      await activateMarket(id);
      fetchMarkets();
    } catch {
      setError('Error al activar el mercado');
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm('¿Desactivar el mercado activo? El carrusel no mostrará rumores.')) return;
    try {
      await deactivateMarket();
      fetchMarkets();
    } catch {
      setError('Error al desactivar');
    }
  };

  const activeMarket = markets.find((m) => m.is_active);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/admin" className="text-azul text-sm hover:underline">&larr; Admin</Link>
          <h1 className="text-2xl font-extrabold">Mercados</h1>
          <p className="text-sm text-gray-500 mt-1">Agrupá los rumores por mercado de pases y controlá cuál se muestra en el carrusel</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {activeMarket && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-green-800">Mercado activo en el carrusel</p>
            <p className="text-green-700 font-bold">{activeMarket.name}</p>
          </div>
          <button
            onClick={handleDeactivate}
            className="text-xs text-gray-500 hover:text-red-600 border border-gray-200 rounded px-3 py-1.5"
          >
            Quitar
          </button>
        </div>
      )}

      {/* New market form */}
      <div className="card mb-6">
        <h2 className="font-bold mb-3">Crear nuevo mercado</h2>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ej: Invierno 2026"
            className="input-field flex-1"
            required
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {creating ? 'Creando...' : 'Crear'}
          </button>
        </form>
      </div>

      {/* Markets list */}
      {loading ? (
        <Loader />
      ) : markets.length === 0 ? (
        <div className="card text-center py-10 text-gray-500">
          No hay mercados creados aún.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500 uppercase">
                <th className="pb-3 pr-4">Nombre</th>
                <th className="pb-3 pr-4">Rumores</th>
                <th className="pb-3 pr-4">Estado</th>
                <th className="pb-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {markets.map((m) => (
                <tr key={m.id} className="border-b border-gray-100">
                  <td className="py-3 pr-4 font-medium">
                    {editingId === m.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input-field py-1 text-sm"
                        autoFocus
                      />
                    ) : (
                      m.name
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-500">
                    {m.rumors_count ?? 0}
                  </td>
                  <td className="py-3 pr-4">
                    {m.is_active ? (
                      <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        Activo
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Inactivo</span>
                    )}
                  </td>
                  <td className="py-3 whitespace-nowrap flex gap-2 items-center">
                    {editingId === m.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(m.id)}
                          disabled={saving}
                          className="text-green-600 text-xs hover:underline disabled:opacity-50"
                        >
                          {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-400 text-xs hover:underline"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        {!m.is_active && (
                          <button
                            onClick={() => handleActivate(m.id)}
                            className="text-green-600 text-xs hover:underline"
                          >
                            Activar
                          </button>
                        )}
                        <button
                          onClick={() => handleStartEdit(m)}
                          className="text-blue-600 text-xs hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="text-red-600 text-xs hover:underline"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
