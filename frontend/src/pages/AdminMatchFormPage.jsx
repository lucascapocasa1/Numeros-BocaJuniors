import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getStadium,
  getStadiumMatch,
  createStadiumMatch,
  updateStadiumMatch,
} from '../api/endpoints';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';

export default function AdminMatchFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sectors, setSectors] = useState([]);

  const [opponent, setOpponent] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [competition, setCompetition] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [prices, setPrices] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const stadiumRes = await getStadium();
        const allSectors = stadiumRes.data?.data?.stadium?.sectors || [];
        setSectors(allSectors);

        if (isEdit) {
          const matchRes = await getStadiumMatch(id);
          const m = matchRes.data?.data;
          if (m) {
            setOpponent(m.opponent || '');
            setMatchDate(m.match_date || '');
            setMatchTime(m.match_time ? m.match_time.slice(0, 5) : '');
            setCompetition(m.competition || '');
            setIsHome(m.is_home !== false);
            // Pre-fill prices from match
            const existingPrices = allSectors.map((s) => {
              const found = (m.prices || []).find((p) => p.sector_id === s.id);
              return {
                sector_id: s.id,
                sector_name: s.name,
                price: found ? String(found.price) : '',
                currency: found ? found.currency : 'ARS',
                enabled: Boolean(found),
              };
            });
            setPrices(existingPrices);
          }
        } else {
          const initialPrices = allSectors.map((s) => ({
            sector_id: s.id,
            sector_name: s.name,
            price: '',
            currency: 'ARS',
            enabled: false,
          }));
          setPrices(initialPrices);
        }
      } catch {
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isEdit]);

  const handlePriceChange = (idx, field, value) => {
    setPrices((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const enabledPrices = prices
      .filter((p) => p.enabled && p.price !== '')
      .map((p) => ({
        sector_id: p.sector_id,
        price: parseFloat(p.price),
        currency: p.currency,
      }));

    // Validate enabled prices
    for (const p of enabledPrices) {
      if (isNaN(p.price) || p.price < 0) {
        setError('Los precios deben ser números válidos mayores o iguales a 0');
        return;
      }
    }

    const payload = {
      opponent,
      match_date: matchDate,
      match_time: matchTime || null,
      competition: competition || null,
      is_home: isHome,
      prices: enabledPrices,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateStadiumMatch(id, payload);
      } else {
        await createStadiumMatch(payload);
      }
      navigate('/admin/estadio');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error;
      if (typeof msg === 'object') {
        const msgs = Object.values(msg).flat();
        setError(msgs.join(', '));
      } else {
        setError(msg || 'Error al guardar el partido');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/admin/estadio" className="text-azul text-sm hover:underline">&larr; Estadio</Link>
        <h1 className="text-2xl font-extrabold">{isEdit ? 'Editar partido' : 'Nuevo partido'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <ErrorMessage message={error} />}

        {/* Match info */}
        <div className="card space-y-4">
          <h2 className="text-base font-semibold">Datos del partido</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Rival *</label>
            <input
              type="text"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              className="input-field w-full"
              placeholder="Ej: Racing Club"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fecha *</label>
              <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="input-field w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hora</label>
              <input
                type="time"
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
                className="input-field w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Competencia</label>
            <input
              type="text"
              value={competition}
              onChange={(e) => setCompetition(e.target.value)}
              className="input-field w-full"
              placeholder="Ej: Liga Profesional, Copa Argentina"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Condición</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="is_home"
                  checked={isHome}
                  onChange={() => setIsHome(true)}
                  className="accent-azul"
                />
                <span className="text-sm">Local</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="is_home"
                  checked={!isHome}
                  onChange={() => setIsHome(false)}
                  className="accent-azul"
                />
                <span className="text-sm">Visitante</span>
              </label>
            </div>
          </div>
        </div>

        {/* Ticket prices per sector */}
        <div className="card space-y-4">
          <div>
            <h2 className="text-base font-semibold">Precios de entradas por sector</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Activá los sectores para los que querés cargar precios.
            </p>
          </div>

          {sectors.length === 0 ? (
            <p className="text-sm text-gray-400">
              No hay sectores configurados. Primero agregá sectores desde la pantalla de Estadio.
            </p>
          ) : (
            <div className="space-y-3">
              {prices.map((p, idx) => (
                <div key={p.sector_id} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 w-36 flex-shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={(e) => handlePriceChange(idx, 'enabled', e.target.checked)}
                      className="accent-azul"
                    />
                    <span className="text-sm font-medium truncate">{p.sector_name}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={p.price}
                    onChange={(e) => handlePriceChange(idx, 'price', e.target.value)}
                    className={`input-field flex-1 ${!p.enabled ? 'opacity-40' : ''}`}
                    placeholder="Precio"
                    disabled={!p.enabled}
                    required={p.enabled}
                  />
                  <select
                    value={p.currency}
                    onChange={(e) => handlePriceChange(idx, 'currency', e.target.value)}
                    className={`input-field w-24 ${!p.enabled ? 'opacity-40' : ''}`}
                    disabled={!p.enabled}
                  >
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Guardando...' : isEdit ? 'Actualizar partido' : 'Crear partido'}
          </button>
          <Link to="/admin/estadio" className="btn-secondary text-center flex-1">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
