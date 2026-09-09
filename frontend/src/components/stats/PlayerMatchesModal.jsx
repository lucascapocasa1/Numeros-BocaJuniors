import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { getPlayerMatches, getPlayer, getContracts, getContract } from '../../api/endpoints';
import Loader from '../common/Loader';
import OfficialBadge from '../OfficialBadge';
import SourceLabel from '../SourceLabel';
import PlayerAvatar from '../PlayerAvatar';
import { translatePosition } from '../../utils/positions';
import { LINE_COLORS, CHART_THEME } from '../../constants/chartColors';

const ROLE_LABELS = { '1': 'Arqueros', '2': 'Defensores', '3': 'Mediocampistas', '4': 'Delanteros' };

const STAT_COLS = [
  { key: 'pj',      label: 'PJ' },
  { key: 'wins',    label: 'Victorias' },
  { key: 'goals',   label: 'Goles' },
  { key: 'asis',    label: 'Asist.' },
  { key: 'minutes', label: 'Minutos' },
  { key: 'yc',      label: '🟨' },
  { key: 'rc',      label: '🟥' },
];

const CHART_STATS = [
  { key: 'pj',    label: 'PJ' },
  { key: 'goals', label: 'Goles' },
  { key: 'asis',  label: 'Asist.' },
  { key: 'wins',  label: 'Victorias' },
  { key: 'yc',    label: 'T.Am.' },
  { key: 'rc',    label: 'T.Ro.' },
];

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

// ── Contract diff helpers ────────────────────────────────────────────────────

const CONTRACT_FIELD_LABELS = {
  full_name: 'Nombre',
  signing_date: 'Fecha de firma',
  expiration_date: 'Fecha de vencimiento',
  termination_date: 'Fecha de rescisión',
  club_pass_percentage: '% Pase club',
  estimated_salary: 'Salario estimado',
  currency: 'Moneda',
};

const CONTRACT_DATE_FIELDS = new Set(['signing_date', 'expiration_date', 'termination_date']);

function normalizeDate(val) {
  if (!val) return null;
  return String(val).split('T')[0];
}

function formatDiffValue(field, value) {
  if (value === null || value === undefined) return 'No disponible';
  if (CONTRACT_DATE_FIELDS.has(field)) return formatDate(normalizeDate(value)) === '-' ? '-' : formatDate(normalizeDate(value));
  if (field === 'club_pass_percentage') return `${parseFloat(value)}%`;
  return String(value);
}

function computeContractDiff(from, to) {
  const changes = [];

  for (const [field, label] of Object.entries(CONTRACT_FIELD_LABELS)) {
    let fromVal = from[field];
    let toVal = to[field];

    if (CONTRACT_DATE_FIELDS.has(field)) {
      fromVal = normalizeDate(fromVal);
      toVal = normalizeDate(toVal);
    } else if (field === 'club_pass_percentage' || field === 'estimated_salary') {
      fromVal = fromVal != null ? parseFloat(fromVal) : null;
      toVal = toVal != null ? parseFloat(toVal) : null;
    }

    if (fromVal !== toVal) {
      changes.push({ type: 'scalar', field, label, from: formatDiffValue(field, fromVal), to: formatDiffValue(field, toVal) });
    }
  }

  const fromClauses = from.clauses || [];
  const toClauses = to.clauses || [];
  const addedClauses = toClauses.filter((c) => !fromClauses.includes(c));
  const removedClauses = fromClauses.filter((c) => !toClauses.includes(c));
  if (addedClauses.length > 0 || removedClauses.length > 0) {
    changes.push({ type: 'array', label: 'Cláusulas', added: addedClauses, removed: removedClauses });
  }

  const fromLoan = from.loan;
  const toLoan = to.loan;
  if (!fromLoan && toLoan) {
    changes.push({ type: 'scalar', field: 'loan', label: 'Préstamo', from: 'Sin préstamo', to: `Cedido a ${toLoan.club}` });
  } else if (fromLoan && !toLoan) {
    changes.push({ type: 'scalar', field: 'loan', label: 'Préstamo', from: `Cedido a ${fromLoan.club}`, to: 'Sin préstamo' });
  } else if (fromLoan && toLoan) {
    if (fromLoan.club !== toLoan.club) {
      changes.push({ type: 'scalar', field: 'loan.club', label: 'Club de préstamo', from: fromLoan.club, to: toLoan.club });
    }
    const fromUntil = normalizeDate(fromLoan.until);
    const toUntil = normalizeDate(toLoan.until);
    if (fromUntil !== toUntil) {
      changes.push({ type: 'scalar', field: 'loan.until', label: 'Hasta (préstamo)', from: formatDate(fromUntil), to: formatDate(toUntil) });
    }
    const fromLC = fromLoan.clauses || [];
    const toLC = toLoan.clauses || [];
    const addedLC = toLC.filter((c) => !fromLC.includes(c));
    const removedLC = fromLC.filter((c) => !toLC.includes(c));
    if (addedLC.length > 0 || removedLC.length > 0) {
      changes.push({ type: 'array', label: 'Cláusulas del préstamo', added: addedLC, removed: removedLC });
    }
  }

  return changes;
}

// ── Shared data-fetching hook ────────────────────────────────────────────────

function usePlayerMatches(playerId) {
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    setMatches(null);

    const now = new Date();
    const currentYear = now.getFullYear();
    const prevYear = currentYear - 1;
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 365);

    Promise.all([
      getPlayerMatches(playerId, currentYear).catch(() => null),
      getPlayerMatches(playerId, prevYear).catch(() => null),
    ])
      .then(([currentRes, prevRes]) => {
        const allMatches = [
          ...(currentRes?.data?.data?.match || []),
          ...(prevRes?.data?.data?.match || []),
        ];
        const filtered = allMatches.filter((m) => {
          const d = new Date(m.shedule);
          return !isNaN(d.getTime()) && d >= cutoff;
        });
        const unique = [...new Map(filtered.map((m) => [m.id, m])).values()];
        unique.sort((a, b) => new Date(b.shedule) - new Date(a.shedule));
        setMatches(unique);
      })
      .finally(() => setLoading(false));
  }, [playerId]);

  return { matches, loading };
}

function computeTotals(matches) {
  if (!matches) return null;
  return matches.reduce(
    (acc, m) => ({
      pj:      acc.pj + 1,
      goals:   acc.goals   + (Number(m.goals)   || 0),
      asis:    acc.asis    + (Number(m.asis)    || 0),
      yc:      acc.yc      + (Number(m.yc)      || 0),
      rc:      acc.rc      + (Number(m.rc)      || 0),
      minutes: acc.minutes + (Number(m.minutes) > 0 ? Number(m.minutes) : 0),
      wins:    acc.wins    + (m.player_winner === 'w' ? 1 : 0),
    }),
    { pj: 0, goals: 0, asis: 0, yc: 0, rc: 0, minutes: 0, wins: 0 }
  );
}

// ── Tooltip for competition logo ─────────────────────────────────────────────

function CompetitionTooltip({ logo, name }) {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);

  const handleShow = () => {
    if (!ref.current || !name) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left + r.width / 2 });
  };

  return (
    <>
      <img
        ref={ref}
        src={logo}
        alt={name || ''}
        className="h-4 w-auto flex-shrink-0 cursor-default"
        onMouseEnter={handleShow}
        onMouseLeave={() => setPos(null)}
        onTouchStart={handleShow}
        onTouchEnd={() => setTimeout(() => setPos(null), 1500)}
      />
      {pos && name && createPortal(
        <span
          style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateX(-50%)', zIndex: 9999 }}
          className="px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap shadow-sm pointer-events-none"
        >
          {name}
        </span>,
        document.body
      )}
    </>
  );
}

// ── Team + player info block (global, above tabs) ────────────────────────────

function PlayerInfoBlock({ playerData, currentTeam }) {
  if (!currentTeam && !playerData) return null;

  const teamName = currentTeam ? (currentTeam.nameShow || currentTeam.fullName || currentTeam.name) : null;
  const tableEntry = currentTeam?.tables?.find((t) => String(t.teamId) === String(currentTeam.id));
  const position = tableEntry?.position;

  const positions = playerData ? [
    { pos: playerData.pos1, pct: playerData.pos1p },
    { pos: playerData.pos2, pct: playerData.pos2p },
    { pos: playerData.pos3, pct: playerData.pos3p },
    { pos: playerData.pos4, pct: playerData.pos4p },
  ].filter((p) => p.pos && Number(p.pct) > 40) : [];

  const hasPhysical = playerData && (playerData.age || playerData.height || playerData.weight || positions.length > 0);

  return (
    <div className="px-4 py-3 border-b bg-gray-50/50">
      {currentTeam && (
        <div className="flex items-center gap-3 mb-2">
          {currentTeam.shield && (
            <img src={currentTeam.shield} alt={teamName} className="h-9 w-auto flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm leading-tight">{teamName}</p>
              {currentTeam.team_flag && (
                <img src={currentTeam.team_flag} alt="" className="h-3.5 w-auto flex-shrink-0 rounded-sm" />
              )}
            </div>
            {currentTeam.category?.cat_name && (
              <p className="text-xs text-gray-500 mt-0.5">
                {position != null ? `${position}° en ` : ''}{currentTeam.category.cat_name}
              </p>
            )}
          </div>
        </div>
      )}

      {hasPhysical && (
        <>
          {(playerData.age || playerData.height || playerData.weight) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
              {playerData.age && (
                <span><span className="font-medium text-gray-800">{playerData.age}</span> años</span>
              )}
              {playerData.height && (
                <span><span className="font-medium text-gray-800">{playerData.height}</span> cm</span>
              )}
              {playerData.weight && (
                <span><span className="font-medium text-gray-800">{playerData.weight}</span> kg</span>
              )}
            </div>
          )}
          {positions.length > 0 && (
            <div className="text-xs mt-1 space-y-0.5">
              {positions.map((p, i) => (
                <p key={i} className="font-medium text-gray-800">{translatePosition(p.pos)}</p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Stats grid (shared between main player and comparisons) ──────────────────

function StatGrid({ totals, cols = 4 }) {
  if (!totals) return null;
  return (
    <div className={`grid grid-cols-4 md:grid-cols-${cols} gap-2`}>
      {STAT_COLS.map(({ key, label }) => (
        <div key={key} className="text-center p-2 bg-gray-50 rounded-xl">
          <p className="text-xl font-bold">{totals[key]}</p>
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Comparison chart ─────────────────────────────────────────────────────────

function ComparisonChart({ players }) {
  const [chartType, setChartType] = useState('bar');

  if (!players || players.length < 2) return null;

  // Use indexed keys to avoid recharts path-notation issues with player names
  const barData = CHART_STATS.map(({ key, label }) => {
    const entry = { stat: label };
    players.forEach((p, i) => {
      entry[`p${i}`] = p.totals?.[key] ?? 0;
    });
    return entry;
  });

  // Radar: normalize each stat to 0-100 relative to best player in group
  const radarData = CHART_STATS.map(({ key, label }) => {
    const maxVal = Math.max(...players.map((p) => p.totals?.[key] ?? 0), 1);
    const entry = { stat: label };
    players.forEach((p, i) => {
      entry[`p${i}`] = Math.round(((p.totals?.[key] ?? 0) / maxVal) * 100);
    });
    return entry;
  });

  return (
    <div className="mt-5 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Gráfico comparativo
        </p>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {[
            { type: 'bar', label: 'Barras' },
            { type: 'radar', label: 'Radar' },
          ].map(({ type, label }) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                chartType === type
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart
              data={barData}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              barCategoryGap="25%"
              barGap={2}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_THEME.grid} />
              <XAxis
                dataKey="stat"
                tick={{ fontSize: 10, fill: CHART_THEME.axisText }}
                tickLine={false}
                axisLine={{ stroke: CHART_THEME.axisLine }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: CHART_THEME.axisText }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                cursor={{ fill: CHART_THEME.tooltipCursor }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {players.map((p, i) => (
                <Bar
                  key={i}
                  dataKey={`p${i}`}
                  name={p.nick}
                  fill={LINE_COLORS[i % LINE_COLORS.length]}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={28}
                />
              ))}
            </BarChart>
          ) : (
            <RadarChart
              data={radarData}
              margin={{ top: 8, right: 30, bottom: 8, left: 30 }}
            >
              <PolarGrid stroke={CHART_THEME.axisLine} />
              <PolarAngleAxis
                dataKey="stat"
                tick={{ fontSize: 10, fill: CHART_THEME.axisText }}
              />
              <PolarRadiusAxis
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: CHART_THEME.axisText }}
                tickCount={4}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(value, name) => [`${value}%`, name]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              {players.map((p, i) => (
                <Radar
                  key={i}
                  dataKey={`p${i}`}
                  name={p.nick}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  fill={LINE_COLORS[i % LINE_COLORS.length]}
                  fillOpacity={0.15}
                />
              ))}
            </RadarChart>
          )}
        </ResponsiveContainer>
      </div>

      {chartType === 'radar' && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 mb-1">
          {players.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-gray-700">
              <span
                className="inline-block w-3 h-1 rounded-full flex-shrink-0"
                style={{ backgroundColor: LINE_COLORS[i % LINE_COLORS.length] }}
              />
              {p.nick}
            </div>
          ))}
        </div>
      )}
      {chartType === 'radar' && (
        <p className="text-xs text-gray-400 text-center mt-1">
          Valores normalizados respecto al mejor del grupo en cada estadística
        </p>
      )}
    </div>
  );
}

// ── Comparison row ────────────────────────────────────────────────────────────

function ComparisonRow({ player, onRemove, onTotalsLoaded }) {
  const { matches, loading } = usePlayerMatches(player.id);
  const totals = useMemo(() => computeTotals(matches), [matches]);
  const onTotalsLoadedRef = useRef(onTotalsLoaded);
  onTotalsLoadedRef.current = onTotalsLoaded;
  const [playerData, setPlayerData] = useState(null);

  useEffect(() => {
    if (!loading && matches !== null) {
      onTotalsLoadedRef.current?.(player.id, totals);
    }
  }, [loading, matches, player.id, totals]);

  useEffect(() => {
    if (player?.id) {
      getPlayer(player.id)
        .then((res) => setPlayerData(res?.data?.data || null))
        .catch(() => null);
    }
  }, [player?.id]);

  const currentTeam = playerData?.current_team || null;
  const teamName = currentTeam ? (currentTeam.nameShow || currentTeam.fullName || currentTeam.name) : null;
  const positions = playerData ? [
    { pos: playerData.pos1, pct: playerData.pos1p },
    { pos: playerData.pos2, pct: playerData.pos2p },
    { pos: playerData.pos3, pct: playerData.pos3p },
    { pos: playerData.pos4, pct: playerData.pos4p },
  ].filter((p) => p.pos && Number(p.pct) > 40) : [];

  return (
    <div className="pt-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2">
          <PlayerAvatar src={player.image} alt={player.nick} className="w-6 h-6 mt-0.5" />
          <div>
            <span className="text-sm font-semibold text-gray-800">{player.nick}</span>
            {currentTeam && (
              <div className="flex items-center gap-1.5 mt-0.5">
                {currentTeam.shield && (
                  <img src={currentTeam.shield} alt={teamName} className="h-4 w-auto flex-shrink-0" />
                )}
                <span className="text-xs text-gray-600">{teamName}</span>
                {currentTeam.team_flag && (
                  <img src={currentTeam.team_flag} alt="" className="h-3 w-auto flex-shrink-0 rounded-sm" />
                )}
              </div>
            )}
            {playerData && (playerData.age || playerData.height || playerData.weight) && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600 mt-0.5">
                {playerData.age && (
                  <span><span className="font-medium text-gray-800">{playerData.age}</span> años</span>
                )}
                {playerData.height && (
                  <span><span className="font-medium text-gray-800">{playerData.height}</span> cm</span>
                )}
                {playerData.weight && (
                  <span><span className="font-medium text-gray-800">{playerData.weight}</span> kg</span>
                )}
              </div>
            )}
            {positions.length > 0 && (
              <div className="text-xs mt-0.5">
                {positions.map((p, i) => (
                  <p key={i} className="font-medium text-gray-800">{translatePosition(p.pos)}</p>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-400 transition-colors text-xs leading-none mt-0.5"
          aria-label="Quitar comparación"
        >
          ✕
        </button>
      </div>
      {loading ? (
        <div className="py-3 flex justify-center"><Loader /></div>
      ) : totals ? (
        <StatGrid totals={totals} cols={7} />
      ) : (
        <p className="text-xs text-gray-400 text-center py-2">Sin datos</p>
      )}
    </div>
  );
}

// ── Comparison panel ─────────────────────────────────────────────────────────

function ComparisonPanel({ currentPlayerId, pool, mainPlayerTotals, mainPlayerNick }) {
  const [comparisons, setComparisons] = useState([]);
  const [comparisonTotals, setComparisonTotals] = useState({});

  const handleTotalsLoaded = useCallback((id, totals) => {
    setComparisonTotals((prev) => ({ ...prev, [String(id)]: totals }));
  }, []);

  const available = (pool || []).filter(
    (p) =>
      p.external_id &&
      String(p.external_id) !== String(currentPlayerId) &&
      !comparisons.some((c) => String(c.id) === String(p.external_id))
  );

  const addComparison = (player) => {
    setComparisons((prev) => [
      ...prev,
      { id: player.external_id, nick: player.full_name, image: player.player_avatar },
    ]);
  };

  const chartPlayers = useMemo(() => {
    if (!mainPlayerTotals) return [];
    const players = [{ id: currentPlayerId, nick: mainPlayerNick || 'Jugador', totals: mainPlayerTotals }];
    for (const c of comparisons) {
      const t = comparisonTotals[String(c.id)];
      if (t !== undefined) {
        players.push({ id: c.id, nick: c.nick, totals: t });
      }
    }
    return players;
  }, [mainPlayerTotals, mainPlayerNick, currentPlayerId, comparisons, comparisonTotals]);

  if (available.length === 0 && comparisons.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Comparar con</p>

      {available.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {available.map((p) => (
            <button
              key={p.external_id}
              onClick={() => addComparison(p)}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-700 transition-colors"
            >
              <span className="text-gray-400 font-bold">+</span> {p.full_name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4 divide-y divide-gray-100">
        {comparisons.map((p) => (
          <ComparisonRow
            key={p.id}
            player={p}
            onRemove={() => {
              setComparisons((prev) => prev.filter((c) => c.id !== p.id));
              setComparisonTotals((prev) => {
                const next = { ...prev };
                delete next[String(p.id)];
                return next;
              });
            }}
            onTotalsLoaded={handleTotalsLoaded}
          />
        ))}
      </div>

      {chartPlayers.length >= 2 && (
        <ComparisonChart players={chartPlayers} />
      )}
    </div>
  );
}

// ── Stats tab content ─────────────────────────────────────────────────────────

function PlayerMatchesSection({ player, comparePool }) {
  const { matches, loading } = usePlayerMatches(player.id);
  const totals = useMemo(() => computeTotals(matches), [matches]);

  if (loading) return <div className="py-8"><Loader /></div>;

  if (!matches || matches.length === 0) {
    return (
      <>
        <p className="text-sm text-gray-500 py-6 text-center">Sin partidos registrados en los últimos 365 días</p>
        {comparePool && (
          <ComparisonPanel
            currentPlayerId={player.id}
            pool={comparePool}
            mainPlayerTotals={totals}
            mainPlayerNick={player.nick}
          />
        )}
      </>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <StatGrid totals={totals} cols={7} />
      </div>

      {comparePool && (
        <ComparisonPanel
          currentPlayerId={player.id}
          pool={comparePool}
          mainPlayerTotals={totals}
          mainPlayerNick={player.nick}
        />
      )}

      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mt-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b uppercase tracking-wide">
              <th className="pb-2 pr-3"></th>
              <th className="pb-2 pr-3">Partido</th>
              <th className="pb-2 text-center px-2">Min</th>
              <th className="pb-2 text-center px-2">G</th>
              <th className="pb-2 text-center px-2">A</th>
              <th className="pb-2 text-center px-2">🟨</th>
              <th className="pb-2 text-center px-2">🟥</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => {
              const score = `${m.r1}–${m.r2}`;
              const date = new Date(m.shedule);
              const yr = String(date.getFullYear()).slice(-2);
              const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${yr}`;
              const competitionName = m.competition_name || m.competition || null;

              return (
                <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1.5">
                      <CompetitionTooltip logo={m.competition_logo} name={competitionName} />
                      <span className="text-xs text-gray-400">{dateStr}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs whitespace-nowrap">
                    {m.team1_name} <span className="text-gray-400">{score}</span> {m.team2_name}
                  </td>
                  <td className="py-2 text-center px-2 text-gray-500">
                    {Number(m.minutes) > 0 ? m.minutes : '–'}
                  </td>
                  <td className="py-2 text-center px-2">{m.goals || 0}</td>
                  <td className="py-2 text-center px-2">{m.asis || 0}</td>
                  <td className="py-2 text-center px-2">{m.yc || 0}</td>
                  <td className="py-2 text-center px-2">{m.rc || 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Contract tab content ──────────────────────────────────────────────────────

function PlayerContractSection({ player }) {
  const [contract, setContract] = useState(undefined);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setContract(undefined);
    setHistory([]);
    getContracts({ external_id: player.id, status: 'vigente', per_page: 1 })
      .then((res) => {
        const results = res.data?.data || [];
        if (results.length === 0) {
          setContract(null);
          return;
        }
        const basic = results[0];
        setContract(basic);
        return getContract(basic.id).then((detail) => {
          setContract(detail.data.data);
          setHistory(detail.data.history || []);
        });
      })
      .catch(() => setContract(null))
      .finally(() => setLoading(false));
  }, [player.id]);

  if (loading) return <div className="py-8"><Loader /></div>;

  if (!contract) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center">
        No existe un contrato activo con el club.
      </p>
    );
  }

  const allClauses = [...(contract.clauses || []), ...(contract.loan?.clauses || [])];

  return (
    <div className="space-y-4 text-sm">
      {contract.loan && (
        <div className="p-3 bloque-prestamo">
          <p className="bloque-prestamo-titulo mb-2">
            Cedido a préstamo en {contract.loan.club}
          </p>
          {contract.loan.until && (
            <p className="text-xs text-gray-500">
              Hasta: <span className="font-medium text-gray-700">{formatDate(contract.loan.until)}</span>
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {contract.signing_date && (
          <div>
            <p className="text-xs text-gray-500">Fecha de firma</p>
            <p className="font-medium">{formatDate(contract.signing_date)}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-500">Vencimiento</p>
          <p className="font-medium">{formatDate(contract.expiration_date)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Propiedad</p>
          <p className="font-mono font-bold text-base">{contract.club_pass_percentage}%</p>
        </div>
        {contract.estimated_salary && (
          <div>
            <p className="text-xs text-gray-500">Salario estimado</p>
            <p className="font-mono font-bold text-base">
              {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: contract.currency || 'USD',
                maximumFractionDigits: 0,
              }).format(contract.estimated_salary)}
            </p>
          </div>
        )}
      </div>

      {allClauses.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Cláusulas</p>
          <ul className="space-y-1">
            {allClauses.map((c, i) => (
              <li key={i} className="bg-gray-50 px-3 py-2 rounded break-words">{c}</li>
            ))}
          </ul>
        </div>
      )}

      {contract.links?.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Fuentes</p>
          <ul className="space-y-1">
            {contract.links.map((link, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-azul hover:underline text-xs">
                  <SourceLabel url={link.url} />
                </a>
                {link.official && <OfficialBadge />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {history.length > 0 && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-3">Historial de modificaciones</p>
          {[...history].reverse().map((snapshot, idx, arr) => {
            const nextVersion = idx === 0 ? contract : arr[idx - 1];
            const changes = computeContractDiff(snapshot, nextVersion);
            if (changes.length === 0) return null;
            return (
              <div key={snapshot.id} className="border-l-2 border-gray-200 pl-3 mb-4 last:mb-0">
                <p className="text-xs text-gray-400 mb-1">
                  Registrado el {formatDate(snapshot.created_at)}
                </p>
                <ul className="space-y-1">
                  {changes.map((change, i) => (
                    <li key={i} className="text-xs">
                      {change.type === 'scalar' && (
                        <span>
                          <span className="font-medium text-gray-700">{change.label}:</span>
                          {' '}
                          <span className="text-red-500 line-through">{change.from}</span>
                          {' → '}
                          <span className="text-green-600">{change.to}</span>
                        </span>
                      )}
                      {change.type === 'array' && (
                        <div>
                          <span className="font-medium text-gray-700">{change.label}:</span>
                          {change.added?.map((item, j) => (
                            <p key={`a${j}`} className="ml-2 text-green-600">+ {item}</p>
                          ))}
                          {change.removed?.map((item, j) => (
                            <p key={`r${j}`} className="ml-2 text-red-500 line-through">- {item}</p>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {(() => {
        const url = `https://www.numerosazules.net/contratos/${contract.id}`;
        const waText = `Mirá el contrato de ${player.nick} en Boca Juniors. Datos en Números Azules 👉 ${url}`;
        const xText = `Contrato de ${player.nick} (Boca Juniors). Vía @NumerosAzules 👉 ${url}`;
        return (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-400">Compartir</span>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(waText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-green-600 transition-colors"
              aria-label="Compartir por WhatsApp"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
            <a
              href={`https://x.com/intent/tweet?text=${encodeURIComponent(xText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-900 transition-colors"
              aria-label="Compartir en X"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
          </div>
        );
      })()}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

const ALL_TABS = [
  { key: 'stats',    label: 'Estadísticas' },
  { key: 'contract', label: 'Contrato' },
];

export default function PlayerMatchesModal({ player, onClose, showContract = true, comparePool = null }) {
  const tabs = showContract ? ALL_TABS : ALL_TABS.filter((t) => t.key !== 'contract');
  const [tab, setTab] = useState('stats');
  const [playerData, setPlayerData] = useState(null);

  useEffect(() => {
    if (!player) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [player]);

  useEffect(() => {
    setTab('stats');
    setPlayerData(null);
    if (player?.id) {
      getPlayer(player.id)
        .then((res) => setPlayerData(res?.data?.data || null))
        .catch(() => null);
    }
  }, [player?.id]);

  if (!player) return null;

  const currentTeam = playerData?.current_team || null;
  const isArgentine = playerData?.country?.toLowerCase?.()?.includes('argentin');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <PlayerAvatar src={player.image} alt={player.nick} className="w-9 h-9" />
              {playerData?.country_flag && !isArgentine && (
                <img
                  src={playerData.country_flag}
                  alt=""
                  className="absolute -bottom-0.5 -right-0.5 w-4 h-3 object-cover rounded-sm border border-white"
                />
              )}
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">{player.nick}</p>
              {(player.squadNumber || player.role) && (
                <p className="text-xs text-gray-500">
                  {player.squadNumber ? `#${player.squadNumber}` : ''}
                  {player.squadNumber && player.role ? ' · ' : ''}
                  {ROLE_LABELS[player.role] || ''}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Player + Team Info Block */}
        <PlayerInfoBlock playerData={playerData} currentTeam={currentTeam} />

        {/* Tabs */}
        <div className="flex border-b sticky top-[69px] bg-white z-10">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-azul text-azul'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4">
          {tab === 'stats' && (
            <PlayerMatchesSection player={player} comparePool={comparePool} />
          )}
          {tab === 'contract' && showContract && (
            <PlayerContractSection player={player} />
          )}
        </div>
      </div>
    </div>
  );
}
