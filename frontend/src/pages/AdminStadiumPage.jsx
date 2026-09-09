import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getStadium,
  saveStadiumConfig,
  createStadiumSector,
  updateStadiumSector,
  deleteStadiumSector,
} from '../api/endpoints';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';
import SectionEnableToggle from '../components/admin/SectionEnableToggle';

export default function AdminStadiumPage() {
  const [loading, setLoading] = useState(true);
  const [stadium, setStadium] = useState(null);

  // Stadium config form
  const [configName, setConfigName] = useState('');
  const [configLink, setConfigLink] = useState('');
  const [configLinkOfficial, setConfigLinkOfficial] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');

  // Sector form
  const [sectorName, setSectorName] = useState('');
  const [sectorCapacity, setSectorCapacity] = useState('');
  const [sectorOrder, setSectorOrder] = useState('');
  const [sectorLoading, setSectorLoading] = useState(false);
  const [sectorError, setSectorError] = useState('');
  const [editingSector, setEditingSector] = useState(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    getStadium()
      .then((res) => {
        const data = res.data?.data || {};
        setStadium(data.stadium || null);
        if (data.stadium) {
          setConfigName(data.stadium.name || '');
          setConfigLink(data.stadium.link || '');
          setConfigLinkOfficial(data.stadium.link_official || false);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    setConfigError('');
    setConfigSuccess('');
    setConfigLoading(true);
    try {
      await saveStadiumConfig({ name: configName, link: configLink || null, link_official: configLinkOfficial });
      setConfigSuccess('Configuración guardada correctamente');
      fetchData();
    } catch (err) {
      setConfigError(err.response?.data?.message || 'Error al guardar la configuración');
    } finally {
      setConfigLoading(false);
    }
  };

  const handleSectorSubmit = async (e) => {
    e.preventDefault();
    setSectorError('');
    setSectorLoading(true);
    try {
      const payload = {
        name: sectorName,
        capacity: sectorCapacity !== '' ? parseInt(sectorCapacity, 10) : null,
        order: sectorOrder !== '' ? parseInt(sectorOrder, 10) : 0,
      };
      if (editingSector) {
        await updateStadiumSector(editingSector.id, payload);
      } else {
        await createStadiumSector(payload);
      }
      setSectorName('');
      setSectorCapacity('');
      setSectorOrder('');
      setEditingSector(null);
      fetchData();
    } catch (err) {
      setSectorError(err.response?.data?.message || 'Error al guardar el sector');
    } finally {
      setSectorLoading(false);
    }
  };

  const handleEditSector = (sector) => {
    setEditingSector(sector);
    setSectorName(sector.name);
    setSectorCapacity(sector.capacity !== null ? String(sector.capacity) : '');
    setSectorOrder(sector.order !== null ? String(sector.order) : '0');
    setSectorError('');
  };

  const handleCancelEditSector = () => {
    setEditingSector(null);
    setSectorName('');
    setSectorCapacity('');
    setSectorOrder('');
    setSectorError('');
  };

  const handleDeleteSector = async (id) => {
    if (!window.confirm('¿Eliminar este sector?')) return;
    await deleteStadiumSector(id);
    fetchData();
  };

  const sectors = stadium?.sectors || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SectionEnableToggle settingKey="section_estadio_enabled" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/admin" className="text-azul text-sm hover:underline">&larr; Admin</Link>
          <h1 className="text-2xl font-extrabold">Estadio</h1>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="space-y-6">
          {/* Stadium config */}
          <div className="card">
            <h2 className="text-lg font-bold mb-4">Configuración del estadio</h2>
            <form onSubmit={handleConfigSubmit} className="space-y-4">
              {configError && <ErrorMessage message={configError} />}
              {configSuccess && (
                <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">{configSuccess}</div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Nombre del estadio *</label>
                <input
                  type="text"
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  className="input-field w-full"
                  placeholder="Ej: Estadio Alberto J. Armando (La Bombonera)"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Enlace general (opcional)</label>
                <input
                  type="url"
                  value={configLink}
                  onChange={(e) => setConfigLink(e.target.value)}
                  className="input-field w-full"
                  placeholder="https://..."
                />
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="linkOfficial"
                    checked={configLinkOfficial}
                    onChange={(e) => setConfigLinkOfficial(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="linkOfficial" className="text-sm text-gray-700">Enlace oficial</label>
                </div>
              </div>
              <button type="submit" disabled={configLoading} className="btn-primary">
                {configLoading ? 'Guardando...' : 'Guardar configuración'}
              </button>
            </form>
          </div>

          {/* Sectors */}
          <div className="card">
            <h2 className="text-lg font-bold mb-4">Sectores del estadio</h2>

            {sectors.length > 0 && (
              <div className="mb-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-gray-500 uppercase">
                      <th className="pb-3 pr-4">Sector</th>
                      <th className="pb-3 pr-4 text-right">Capacidad</th>
                      <th className="pb-3 pr-4 text-right">Orden</th>
                      <th className="pb-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectors.map((s) => (
                      <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-4 font-medium">{s.name}</td>
                        <td className="py-2 pr-4 text-right font-mono text-gray-600">
                          {s.capacity !== null ? s.capacity.toLocaleString('es-AR') : '-'}
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-500">{s.order}</td>
                        <td className="py-2 whitespace-nowrap">
                          <button
                            onClick={() => handleEditSector(s)}
                            className="text-blue-600 text-xs mr-3 hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteSector(s.id)}
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

            {!stadium && (
              <p className="text-sm text-gray-400 mb-4">
                Primero guardá la configuración del estadio para poder agregar sectores.
              </p>
            )}

            {stadium && (
              <form onSubmit={handleSectorSubmit} className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  {editingSector ? `Editando: ${editingSector.name}` : 'Agregar sector'}
                </h3>
                {sectorError && <ErrorMessage message={sectorError} />}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={sectorName}
                      onChange={(e) => setSectorName(e.target.value)}
                      className="input-field w-full"
                      placeholder="Ej: Popular"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Capacidad</label>
                    <input
                      type="number"
                      min="0"
                      value={sectorCapacity}
                      onChange={(e) => setSectorCapacity(e.target.value)}
                      className="input-field w-full"
                      placeholder="Ej: 5000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Orden</label>
                    <input
                      type="number"
                      min="0"
                      value={sectorOrder}
                      onChange={(e) => setSectorOrder(e.target.value)}
                      className="input-field w-full"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={sectorLoading} className="btn-primary text-sm">
                    {sectorLoading ? 'Guardando...' : editingSector ? 'Actualizar sector' : 'Agregar sector'}
                  </button>
                  {editingSector && (
                    <button type="button" onClick={handleCancelEditSector} className="btn-secondary text-sm">
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
