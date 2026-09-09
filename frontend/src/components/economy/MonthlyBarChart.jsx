import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { getEconomyMonthlySummary, getEconomyRecords, getEconomyOverdueEvolution, getSectionSettings } from '../../api/endpoints';
import Loader from '../common/Loader';
import OfficialBadge from '../OfficialBadge';
import EconomyRecordCard from './EconomyRecordCard';
import SourceLabel from '../SourceLabel';
import { CHART_THEME } from '../../constants/chartColors';

const CURRENCY_COLORS = {
  usd: '#16a34a',
  eur: '#7c3aed',
  ars: '#ea580c',
};


function formatAmount(value, currency) {
  if (value === 0) {
    if (currency === 'ARS') return '$ 0';
    if (currency === 'USD') return 'USD 0';
    return 'EUR 0';
  }
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
  if (currency === 'ARS') return `$ ${formatted}`;
  if (currency === 'USD') return `USD ${formatted}`;
  return `EUR ${formatted}`;
}

function formatAxisValue(v) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return v.toFixed(0);
}


function CustomTooltip({ active, payload, label, type }) {
  if (!active || !payload || payload.length === 0) return null;

  const raw = payload[0]?.payload || {};
  const usdVal = raw[`${type}_usd`] ?? 0;
  const eurVal = raw[`${type}_eur`] ?? 0;
  const arsVal = raw[`${type}_ars`] ?? 0;

  const typeLabel = type === 'egresos' ? 'Egresos' : 'Ingresos';

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm min-w-[160px]">
      <p className="font-bold text-gray-800 mb-2 border-b border-gray-100 pb-1">
        {label} · {typeLabel}
      </p>
      {usdVal > 0 && (
        <div className="flex justify-between gap-4">
          <span style={{ color: CURRENCY_COLORS.usd }}>USD</span>
          <span className="font-mono font-semibold">{formatAmount(usdVal, 'USD')}</span>
        </div>
      )}
      {eurVal > 0 && (
        <div className="flex justify-between gap-4">
          <span style={{ color: CURRENCY_COLORS.eur }}>EUR</span>
          <span className="font-mono font-semibold">{formatAmount(eurVal, 'EUR')}</span>
        </div>
      )}
      {arsVal > 0 && (
        <div className="flex justify-between gap-4">
          <span style={{ color: CURRENCY_COLORS.ars }}>ARS</span>
          <span className="font-mono font-semibold">{formatAmount(arsVal, 'ARS')}</span>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

function formatMoney(amount, currency) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: currency || 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompact(amount) {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return sign + (abs / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(0) + 'K';
  return sign + abs.toFixed(0);
}

function formatDecimal(amount) {
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(amount);
}

export default function MonthlyBarChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [type, setType] = useState('egresos');
  const [scales, setScales] = useState({ usd: null, eur: null, ars: null });
  const scrollRef = useRef(null);
  const overdueScrollRef = useRef(null);
  const [upcoming, setUpcoming] = useState([]);
  const [pending, setPending] = useState([]);
  const [pendingTotals, setPendingTotals] = useState(null);
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [overdueData, setOverdueData] = useState([]);
  const [overdueType, setOverdueType] = useState('egresos');

  useEffect(() => {
    getSectionSettings()
      .then((res) => {
        const d = res.data?.data || {};
        setScales({
          usd: d.chart_scale_usd || null,
          eur: d.chart_scale_eur || null,
          ars: d.chart_scale_ars || null,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getEconomyMonthlySummary()
      .then((res) => setData(res.data.data || []))
      .catch(() => setError('No se pudieron cargar los datos del gráfico.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getEconomyOverdueEvolution()
      .then((res) => setOverdueData(res.data.data || []))
      .catch(() => setOverdueData([]));
  }, []);

  useEffect(() => {
    if (overdueData.length > 0 && overdueScrollRef.current) {
      const container = overdueScrollRef.current;
      container.scrollLeft = container.scrollWidth;
    }
  }, [overdueData]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    getEconomyRecords({ date_from: today, sort_by: 'record_date', sort_dir: 'asc', per_page: 5 })
      .then((res) => setUpcoming(res.data.data || []))
      .catch(() => setUpcoming([]));
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    getEconomyRecords({ carried_out: false, date_to: today, sort_by: 'record_date', sort_dir: 'desc' })
      .then((res) => {
        setPending(res.data.data || []);
        setPendingTotals(res.data.totals || null);
      })
      .catch(() => {
        setPending([]);
        setPendingTotals(null);
      });
  }, []);

  // Scroll to the "today" area on mount (month index 24 out of 49)
  useEffect(() => {
    if (data.length > 0 && scrollRef.current) {
      const container = scrollRef.current;
      const barWidth = 52;
      const todayIndex = 24;
      const scrollTarget = Math.max(0, todayIndex * barWidth - container.clientWidth / 2);
      container.scrollLeft = scrollTarget;
    }
  }, [data]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const applyScale = (value, scale) => (scale ? (value || 0) / scale : (value || 0));

  const overdueChartData = overdueData.map((d) => ({
    ...d,
    [`${overdueType}_usd_display`]: applyScale(d[`${overdueType}_usd`], scales.usd),
    [`${overdueType}_eur_display`]: applyScale(d[`${overdueType}_eur`], scales.eur),
    [`${overdueType}_ars_display`]: applyScale(d[`${overdueType}_ars`], scales.ars),
  }));

  const chartData = data.map((d) => ({
    ...d,
    [`${type}_usd_display`]: applyScale(d[`${type}_usd`], scales.usd),
    [`${type}_eur_display`]: applyScale(d[`${type}_eur`], scales.eur),
    [`${type}_ars_display`]: applyScale(d[`${type}_ars`], scales.ars),
  }));

  const hasData = chartData.some(
    (d) => d[`${type}_usd_display`] > 0 || d[`${type}_eur_display`] > 0 || d[`${type}_ars_display`] > 0
  );

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Compromisos económicos</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Últimos 24 meses · Mes actual · Próximos 24 meses
          </p>
        </div>
        <Link to="/economia" className="text-sm text-azul hover:underline font-medium">
          Ver todos →
        </Link>
      </div>

      {/* Type toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-4">
        {['egresos', 'ingresos'].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              type === t
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16">
          <Loader />
        </div>
      ) : error ? (
        <div className="py-12 text-center text-gray-400 text-sm">{error}</div>
      ) : !hasData ? (
        <div className="py-12 text-center text-gray-400 text-sm">
          No hay datos registrados para el período seleccionado.
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-3 text-sm">
            {[
              ['usd', 'USD'],
              ['eur', 'EUR'],
              ['ars', 'ARS'],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm inline-block"
                  style={{ backgroundColor: CURRENCY_COLORS[key] }}
                />
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="w-0.5 h-4 bg-blue-700 inline-block" />
              <span className="text-gray-600">Mes actual</span>
            </div>
          </div>

          {/* Scrollable chart container */}
          <div
            ref={scrollRef}
            className="overflow-x-auto pb-2"
            role="region"
            aria-label="Gráfico de ingresos y egresos mensuales"
          >
            <div style={{ minWidth: `${chartData.length * 52}px`, height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 8, bottom: 40 }}
                  barCategoryGap="20%"
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_THEME.grid} />
                  <XAxis
                    dataKey="month_label"
                    tick={{ fontSize: 10, fill: CHART_THEME.axisText }}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    tickLine={false}
                    axisLine={{ stroke: CHART_THEME.axisLine }}
                  />
                  <YAxis
                    tickFormatter={formatAxisValue}
                    tick={{ fontSize: 10, fill: CHART_THEME.axisText }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip
                    content={<CustomTooltip type={type} />}
                    cursor={{ fill: CHART_THEME.tooltipCursor }}
                  />
                  {data.findIndex((d) => d.month === todayKey) !== -1 && (
                    <ReferenceLine
                      x={data.find((d) => d.month === todayKey)?.month_label}
                      stroke="#1d4ed8"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                    />
                  )}
                  <Bar dataKey={`${type}_usd_display`} name="USD" fill={CURRENCY_COLORS.usd} radius={[2, 2, 0, 0]} maxBarSize={24} />
                  <Bar dataKey={`${type}_eur_display`} name="EUR" fill={CURRENCY_COLORS.eur} radius={[2, 2, 0, 0]} maxBarSize={24} />
                  <Bar dataKey={`${type}_ars_display`} name="ARS" fill={CURRENCY_COLORS.ars} radius={[2, 2, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Upcoming commitments */}
      {upcoming.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-5">
          <button
            onClick={() => setUpcomingOpen((v) => !v)}
            className="flex items-center justify-between w-full mb-3 text-left"
          >
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              Próximos compromisos
              <span className="text-gray-400 font-normal normal-case tracking-normal">({upcoming.length})</span>
            </h3>
            <span className="text-gray-400 text-xs">{upcomingOpen ? '▲' : '▼'}</span>
          </button>
          {upcomingOpen && (
            <div className="flex justify-end mb-3">
              <Link to="/economia" className="text-xs text-azul hover:underline font-medium">
                Ver todos →
              </Link>
            </div>
          )}
          {upcomingOpen && (
            <>
              <div className="block md:hidden space-y-3">
                {upcoming.map((r) => (
                  <EconomyRecordCard key={r.id} record={r} />
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase">
                      <th className="pb-2 pr-4">Fecha</th>
                      <th className="pb-2 pr-4">Descripción</th>
                      <th className="pb-2 pr-4">Entidad</th>
                      <th className="pb-2 pr-4">Tipo</th>
                      <th className="pb-2 pr-4 text-right">Monto</th>
                      <th className="pb-2">Fuentes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 pr-4 whitespace-nowrap text-gray-500 text-xs">{formatDate(r.record_date)}</td>
                        <td className="py-2 pr-4">
                          <span className="font-medium">{r.description || '-'}</span>
                        </td>
                        <td className="py-2 pr-4 text-gray-500 text-xs">{r.entity || '-'}</td>
                        <td className="py-2 pr-4">
                          <span className={r.type === 'cobro' ? 'badge-cobro' : 'badge-pago'}>
                            {r.type}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-right font-mono whitespace-nowrap text-xs">
                          {formatMoney(r.amount, r.currency)}
                        </td>
                        <td className="py-2">
                          {Array.isArray(r.links) && r.links.length > 0 ? (
                            <ul className="text-xs text-gray-600 space-y-0.5">
                              {r.links.slice(0, 2).map((link, i) => (
                                <li key={i} className="flex items-center gap-1">
                                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-azul hover:underline truncate block">
                                    <SourceLabel url={link.url} />
                                  </a>
                                  {link.official && <OfficialBadge />}
                                </li>
                              ))}
                              {r.links.length > 2 && <li className="text-gray-400">+{r.links.length - 2} más</li>}
                            </ul>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Pending totals summary */}
      {pendingTotals && pendingTotals.cantidad > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-5">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
            Pagos/Cobros no confirmados
          </h3>
          <div className="space-y-4">
            {[
              { key: 'usd', label: 'USD', color: CURRENCY_COLORS.usd },
              { key: 'eur', label: 'EUR', color: CURRENCY_COLORS.eur },
              { key: 'ars', label: 'ARS', color: CURRENCY_COLORS.ars },
            ]
              .filter(({ key }) => pendingTotals[`total_cobros_${key}`] > 0 || pendingTotals[`total_pagos_${key}`] > 0)
              .map(({ key, label, color }) => {
                const cobros = pendingTotals[`total_cobros_${key}`] || 0;
                const pagos = pendingTotals[`total_pagos_${key}`] || 0;
                const balance = pendingTotals[`balance_${key}`] || 0;
                const currency = key.toUpperCase();
                return (
                  <div key={key}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: color }} />
                      <span className="text-xs font-bold text-gray-600">{label}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-ingreso-light border border-ingreso-light rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500 mb-1">Cobros</p>
                        <p className="font-mono font-semibold text-xs text-ingreso-dark leading-tight">
                          <span className="md:hidden">{formatCompact(cobros)}</span>
                          <span className="hidden md:inline">{formatDecimal(cobros)}</span>
                        </p>
                      </div>
                      <div className="bg-egreso-light border border-egreso-light rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500 mb-1">Pagos</p>
                        <p className="font-mono font-semibold text-xs text-egreso-dark leading-tight">
                          <span className="md:hidden">{formatCompact(pagos)}</span>
                          <span className="hidden md:inline">{formatDecimal(pagos)}</span>
                        </p>
                      </div>
                      <div className={`border rounded-lg p-2 text-center ${balance >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                        <p className="text-xs text-gray-500 mb-1">Balance</p>
                        <p className={`font-mono font-semibold text-xs leading-tight ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                          <span className="md:hidden">{formatCompact(balance)}</span>
                          <span className="hidden md:inline">{formatDecimal(balance)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Overdue evolution chart */}
      {overdueChartData.length > 0 && overdueChartData.some((d) => d[`${overdueType}_usd_display`] > 0 || d[`${overdueType}_eur_display`] > 0 || d[`${overdueType}_ars_display`] > 0) && (
        <div className="mt-6 border-t border-gray-100 pt-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              Evolución de atrasos
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Montos adeudados por mes · Últimos 4 años</p>
          </div>

          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-4">
            {['egresos', 'ingresos'].map((t) => (
              <button
                key={t}
                onClick={() => setOverdueType(t)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  overdueType === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 mb-3 text-sm">
            {[['usd', 'USD'], ['eur', 'EUR'], ['ars', 'ARS']].map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: CURRENCY_COLORS[key] }} />
                <span className="text-gray-600">{label}</span>
              </div>
            ))}
          </div>

          <div ref={overdueScrollRef} className="overflow-x-auto pb-2">
            <div style={{ minWidth: `${overdueChartData.length * 52}px`, height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={overdueChartData}
                  margin={{ top: 8, right: 8, left: 8, bottom: 40 }}
                  barCategoryGap="20%"
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_THEME.grid} />
                  <XAxis
                    dataKey="month_label"
                    tick={{ fontSize: 10, fill: CHART_THEME.axisText }}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    tickLine={false}
                    axisLine={{ stroke: CHART_THEME.axisLine }}
                  />
                  <YAxis
                    tickFormatter={formatAxisValue}
                    tick={{ fontSize: 10, fill: CHART_THEME.axisText }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip
                    content={<CustomTooltip type={overdueType} />}
                    cursor={{ fill: CHART_THEME.tooltipCursor }}
                  />
                  <Bar dataKey={`${overdueType}_usd_display`} name="USD" fill={CURRENCY_COLORS.usd} radius={[2, 2, 0, 0]} maxBarSize={24} />
                  <Bar dataKey={`${overdueType}_eur_display`} name="EUR" fill={CURRENCY_COLORS.eur} radius={[2, 2, 0, 0]} maxBarSize={24} />
                  <Bar dataKey={`${overdueType}_ars_display`} name="ARS" fill={CURRENCY_COLORS.ars} radius={[2, 2, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Pending confirmation */}
      {pending.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-5">
          <button
            onClick={() => setPendingOpen((v) => !v)}
            className="flex items-center justify-between w-full mb-3 text-left"
          >
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              Ver detalle de no confirmados
              <span className="text-gray-400 font-normal normal-case tracking-normal">({pending.length})</span>
            </h3>
            <span className="text-gray-400 text-xs">{pendingOpen ? '▲' : '▼'}</span>
          </button>
          {pendingOpen && (
            <>
              <div className="flex justify-end mb-3">
                <Link to="/economia" className="text-xs text-azul hover:underline font-medium">
                  Ver todos →
                </Link>
              </div>
              <div className="block md:hidden space-y-3">
                {pending.map((r) => (
                  <EconomyRecordCard key={r.id} record={r} />
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase">
                      <th className="pb-2 pr-4">Fecha</th>
                      <th className="pb-2 pr-4">Descripción</th>
                      <th className="pb-2 pr-4">Entidad</th>
                      <th className="pb-2 pr-4">Tipo</th>
                      <th className="pb-2 pr-4 text-right">Monto</th>
                      <th className="pb-2">Fuentes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((r) => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 pr-4 whitespace-nowrap text-gray-500 text-xs">{formatDate(r.record_date)}</td>
                        <td className="py-2 pr-4">
                          <span className="font-medium">{r.description || '-'}</span>
                        </td>
                        <td className="py-2 pr-4 text-gray-500 text-xs">{r.entity || '-'}</td>
                        <td className="py-2 pr-4">
                          <span className={r.type === 'cobro' ? 'badge-cobro' : 'badge-pago'}>
                            {r.type}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-right font-mono whitespace-nowrap text-xs">
                          {formatMoney(r.amount, r.currency)}
                        </td>
                        <td className="py-2">
                          {Array.isArray(r.links) && r.links.length > 0 ? (
                            <ul className="text-xs text-gray-600 space-y-0.5">
                              {r.links.slice(0, 2).map((link, i) => (
                                <li key={i} className="flex items-center gap-1">
                                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-azul hover:underline truncate block">
                                    <SourceLabel url={link.url} />
                                  </a>
                                  {link.official && <OfficialBadge />}
                                </li>
                              ))}
                              {r.links.length > 2 && <li className="text-gray-400">+{r.links.length - 2} más</li>}
                            </ul>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
