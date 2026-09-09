import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { getBalancesEvolution } from '../../api/endpoints';
import Loader from '../common/Loader';
import { LINE_COLORS, CHART_THEME } from '../../constants/chartColors';

function formatAmount(value) {
  if (value === null || value === undefined) return '-';
  const abs = Math.abs(value);
  let formatted;
  if (abs >= 1_000_000_000) {
    formatted = (value / 1_000_000_000).toFixed(1) + 'B';
  } else if (abs >= 1_000_000) {
    formatted = (value / 1_000_000).toFixed(1) + 'M';
  } else if (abs >= 1_000) {
    formatted = (value / 1_000).toFixed(0) + 'K';
  } else {
    formatted = value.toFixed(0);
  }
  return formatted;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm min-w-[180px]">
      <p className="font-bold text-gray-800 mb-2 border-b border-gray-100 pb-1">Ejercicio {label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex justify-between gap-4 py-0.5">
          <span className="truncate" style={{ color: entry.color }}>{entry.name}</span>
          <span className="font-mono font-semibold" style={{ color: entry.color }}>
            USD {formatAmount(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * BalanceLineChart
 *
 * Props:
 * - compact (bool): if true, renders a smaller version without item toggles (for landing)
 * - showLink (bool): show "Ver balances" link
 * - selectedItems (array of item ids): pre-filter items to show (overrides default_active)
 */
export default function BalanceLineChart({ compact = false, showLink = false, selectedItems = null }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeItems, setActiveItems] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Lock body scroll while the item selector modal is open
  useEffect(() => {
    if (!dropdownOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [dropdownOpen]);

  useEffect(() => {
    setLoading(true);
    getBalancesEvolution()
      .then((res) => {
        const d = res.data?.data || { exercises: [], series: [] };
        setData(d);
        const ids = d.series.map((s) => s.id);
        if (selectedItems) {
          setActiveItems(selectedItems.filter((id) => ids.includes(id)));
        } else {
          // Use default_active configured by admin (fallback: all active)
          setActiveItems(d.series.filter((s) => s.default_active !== false).map((s) => s.id));
        }
      })
      .catch(() => setError('No se pudieron cargar los datos de evolución.'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleItem = (id) => {
    setActiveItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => setActiveItems(data?.series.map((s) => s.id) || []);
  const deselectAll = () => setActiveItems([]);

  if (loading) {
    return (
      <div className={`${compact ? '' : 'card'} py-16`}>
        <Loader />
      </div>
    );
  }

  if (error) {
    return <div className={`${compact ? '' : 'card'} py-12 text-center text-gray-400 text-sm`}>{error}</div>;
  }

  if (!data || data.exercises.length === 0) {
    return (
      <div className={`${compact ? '' : 'card'} py-12 text-center text-gray-400 text-sm`}>
        No hay datos de balances disponibles aún.
      </div>
    );
  }

  // Build Recharts data: array of { exercise, [itemName]: value }
  const chartData = data.exercises.map((exercise, idx) => {
    const point = { exercise };
    data.series.forEach((serie) => {
      point[`item_${serie.id}`] = serie.values[idx] ?? 0;
    });
    return point;
  });

  const visibleSeries = data.series.filter((s) => activeItems.includes(s.id));
  const allSelected = activeItems.length === data.series.length;

  return (
    <div className={compact ? '' : 'card'}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Evolución de balances</h2>
          <p className="text-sm text-gray-500 mt-0.5">Comparativa por ejercicio</p>
        </div>
        {showLink && (
          <Link
            to="/balances"
            className="text-sm text-azul hover:underline font-medium whitespace-nowrap"
          >
            Ver balances →
          </Link>
        )}
      </div>

      {/* Item selector */}
      {data.series.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setDropdownOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-gray-700">
              Ítems ({activeItems.length}/{data.series.length})
            </span>
          </button>
        </div>
      )}

      {dropdownOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setDropdownOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <p className="font-bold text-base text-gray-900">Ítems a mostrar</p>
              <button
                onClick={() => setDropdownOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Select / Deselect all */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
              <button
                onClick={selectAll}
                disabled={allSelected}
                className="text-xs text-azul hover:underline font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Seleccionar todos
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={deselectAll}
                disabled={activeItems.length === 0}
                className="text-xs text-gray-500 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Deseleccionar todos
              </button>
            </div>

            {/* Items list */}
            <div className="overflow-y-auto py-1">
              {data.series.map((serie, idx) => {
                const color = LINE_COLORS[idx % LINE_COLORS.length];
                const active = activeItems.includes(serie.id);
                return (
                  <div
                    key={serie.id}
                    role="checkbox"
                    aria-checked={active}
                    tabIndex={0}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer select-none"
                    onClick={() => toggleItem(serie.id)}
                    onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && toggleItem(serie.id)}
                  >
                    <div
                      className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                      style={
                        active
                          ? { backgroundColor: color, borderColor: color }
                          : { borderColor: CHART_THEME.checkboxBorder }
                      }
                    >
                      {active && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-gray-700 truncate" title={serie.name}>{serie.short_name || serie.name}</span>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border-t border-gray-100">
              <button
                onClick={() => setDropdownOpen(false)}
                className="w-full py-2 text-sm font-medium text-white bg-azul rounded-lg hover:opacity-90 transition-opacity"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {visibleSeries.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm">
          Seleccioná al menos un ítem para visualizar.
        </div>
      ) : (
        <>
          <div style={{ height: compact ? 260 : 360 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_THEME.grid} />
                <XAxis
                  dataKey="exercise"
                  tick={{ fontSize: 12, fill: CHART_THEME.axisText }}
                  tickLine={false}
                  axisLine={{ stroke: CHART_THEME.axisLine }}
                />
                <YAxis
                  tickFormatter={(v) => formatAmount(v)}
                  tick={{ fontSize: 10, fill: CHART_THEME.axisText }}
                  tickLine={false}
                  axisLine={false}
                  width={65}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: CHART_THEME.tooltipCursor }} />
                {visibleSeries.map((serie, idx) => {
                  const colorIdx = data.series.findIndex((s) => s.id === serie.id);
                  const color = LINE_COLORS[colorIdx % LINE_COLORS.length];
                  return (
                    <Line
                      key={serie.id}
                      type="monotone"
                      dataKey={`item_${serie.id}`}
                      name={serie.short_name || serie.name}
                      stroke={color}
                      strokeWidth={2}
                      dot={{ r: 4, fill: color, strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pl-[65px]">
            {visibleSeries.map((serie) => {
              const colorIdx = data.series.findIndex((s) => s.id === serie.id);
              const color = LINE_COLORS[colorIdx % LINE_COLORS.length];
              return (
                <div key={serie.id} className="flex items-center gap-1.5 min-w-0">
                  <div className="flex-shrink-0 w-4 rounded" style={{ height: 2, backgroundColor: color }} />
                  <span
                    className="text-xs text-gray-600 truncate max-w-[160px]"
                    title={serie.name}
                  >
                    {serie.short_name || serie.name}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
