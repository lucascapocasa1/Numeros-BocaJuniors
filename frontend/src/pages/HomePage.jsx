import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getContracts, getRights, getRumors, getStadium, getElections, sendContact, getContractRecentMoves, getElectionListLogoUrl } from '../api/endpoints';
import { usePageMeta } from '../hooks/usePageMeta';
import PlayerMatchesModal from '../components/stats/PlayerMatchesModal';
import ElectionListModal from '../components/ElectionListModal';
import ElectionMethodologyModal from '../components/ElectionMethodologyModal';
import Loader from '../components/common/Loader';
import MonthlyBarChart from '../components/economy/MonthlyBarChart';
import BalanceLineChart from '../components/balances/BalanceLineChart';
import StatsWidget from '../components/stats/StatsWidget';
import useSectionSettings from '../hooks/useSectionSettings';
import { translatePosition } from '../utils/positions';
import ContractWidgets from '../components/contracts/ContractWidgets';
import OfficialBadge from '../components/OfficialBadge';
import SourceLabel from '../components/SourceLabel';
import PlayerAvatar from '../components/PlayerAvatar';
import { useDragScroll } from '../hooks/useDragScroll';

const RUMOR_ROLE_LABELS = { '1': 'Arqueros', '2': 'Defensores', '3': 'Mediocampistas', '4': 'Delanteros' };
const RUMOR_ROLE_ORDER = ['1', '2', '3', '4'];

const VIGENCIA_OPTIONS = [
  { value: '6m', label: '6 meses', days: 180 },
  { value: '12m', label: '12 meses', days: 365 },
  { value: '18m', label: '18 meses', days: 540 },
  { value: '24m', label: '24 meses', days: 730 },
];

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

function getDaysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(dateStr);
  return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
}

function ContractCard({ contract, onClick }) {
  const effectiveEnd = contract.termination_date || contract.expiration_date;
  const days = getDaysUntil(effectiveEnd);
  const expired = days < 0;
  const soon = days >= 0 && days <= 60;
  const rescindido = !!contract.termination_date;
  const clickable = !!contract.external_id && !!onClick;

  return (
    <div
      className={`flex-shrink-0 w-60 snap-start card p-4 hover:shadow-md hover:border-azul/20 transition-all duration-200 flex flex-col gap-3 ${clickable ? 'cursor-pointer' : ''}`}
      onClick={clickable ? onClick : undefined}
    >
      <div className="flex items-center gap-3">
        <PlayerAvatar src={contract.player_avatar} alt={contract.full_name} />
        <div className="overflow-hidden flex-1">
          <p className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">
            {contract.full_name}
          </p>
          {Array.isArray(contract.positions) && contract.positions.length > 0 && (
            <div className="text-xs text-gray-400 mt-0.5">
              {contract.positions.map((p, i) => (
                <p key={i}>{translatePosition(p.pos)}</p>
              ))}
            </div>
          )}
          {contract.loan && (
            <span className="text-xs font-semibold text-prestamo">A préstamo en {contract.loan.club}</span>
          )}
        </div>
      </div>

      <div className="space-y-1.5 text-sm flex-1">
        {contract.loan?.until && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">A préstamo hasta</span>
            <span className="font-mono text-xs text-prestamo">{formatDate(contract.loan.until)}</span>
          </div>
        )}
        {contract.loan?.clauses?.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {contract.loan.clauses.map((clause, i) => (
              <span key={i} className="text-xs text-prestamo">— {clause}</span>
            ))}
          </div>
        )}
        {contract.signing_date && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">Firma</span>
            <span className="font-mono text-xs text-gray-700">{formatDate(contract.signing_date)}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-gray-500 text-xs">{rescindido ? 'Rescisión' : 'Vence'}</span>
          <span className={`font-mono text-xs ${expired ? 'text-red-600' : soon ? 'text-yellow-600' : 'text-gray-700'}`}>
            {formatDate(effectiveEnd)}
          </span>
        </div>
        {contract.club_pass_percentage !== null && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">% Pase</span>
            <span className="font-mono text-xs">{contract.club_pass_percentage}%</span>
          </div>
        )}
        {contract.estimated_salary && (
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs">Salario est.</span>
            <span className="font-mono text-xs">
              {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: contract.currency || 'USD',
                maximumFractionDigits: 0,
              }).format(contract.estimated_salary)}
            </span>
          </div>
        )}
      </div>

      {Array.isArray(contract.clauses) && contract.clauses.length > 0 && (
        <div className="pt-1 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Cláusulas</p>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {contract.clauses.slice(0, 2).map((clause, i) => (
              <li key={i} className="bg-gray-50 px-2 py-1 rounded break-words">
                {clause}
              </li>
            ))}
            {contract.clauses.length > 2 && (
              <li className="text-gray-400">+{contract.clauses.length - 2} más</li>
            )}
          </ul>
        </div>
      )}

      {Array.isArray(contract.links) && contract.links.length > 0 && (
        <div className="pt-1 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Fuentes</p>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {contract.links.slice(0, 2).map((link, i) => (
              <li key={i} className="flex items-center gap-1">
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-azul hover:underline truncate">
                  <SourceLabel url={link.url} />
                </a>
                {link.official && <OfficialBadge />}
              </li>
            ))}
            {contract.links.length > 2 && (
              <li className="text-gray-400">+{contract.links.length - 2} más</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// Unified card for Rights and Rumors — both share the same structure
function PlayerCard({ player, onClick, showPositions = false, previousMarkets = [] }) {
  const clickable = !!player.external_id && !!onClick;
  const isArgentine = player.country?.toLowerCase?.()?.includes('argentin');
  const contratado = player.status === 'contratado';
  const positions = showPositions && Array.isArray(player.positions) ? player.positions : [];
  const prevMarkets = previousMarkets.length > 0 ? previousMarkets : (player.previous_markets || []);

  return (
    <div
      className={`flex-shrink-0 w-60 snap-start card p-4 hover:shadow-md hover:border-azul/20 transition-all duration-200 flex flex-col gap-3 ${clickable ? 'cursor-pointer' : ''}`}
      onClick={clickable ? onClick : undefined}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <PlayerAvatar src={player.player_avatar} alt={player.full_name} />
          {player.country_flag && !isArgentine && (
            <img
              src={player.country_flag}
              alt=""
              className="absolute -bottom-0.5 -right-0.5 w-4 h-3 object-cover rounded-sm border border-white"
            />
          )}
        </div>
        <div className="overflow-hidden flex-1">
          <p className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">
            {player.full_name}
          </p>
          {player.current_team_name && (
            <p className="text-xs text-gray-500 truncate">{player.current_team_name}</p>
          )}
          {positions.length > 0 && (
            <div className="text-xs text-gray-400 mt-0.5">
              {positions.map((p, i) => (
                <p key={i}>{translatePosition(p.pos)}</p>
              ))}
            </div>
          )}
          {contratado && (
            <span className="inline-block mt-1 text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
              Contratado
            </span>
          )}
        </div>
      </div>

      {Array.isArray(player.clauses) && player.clauses.length > 0 && (
        <div className="pt-1 border-t border-gray-100 flex-1">
          <p className="text-xs text-gray-400 mb-1">Cláusulas</p>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {player.clauses.slice(0, 3).map((clause, i) => (
              <li key={i} className="bg-gray-50 px-2 py-1 rounded break-words">{clause}</li>
            ))}
            {player.clauses.length > 3 && (
              <li className="text-gray-400">+{player.clauses.length - 3} más</li>
            )}
          </ul>
        </div>
      )}

      {Array.isArray(player.links) && player.links.length > 0 && (
        <div className="pt-1 border-t border-gray-100">
          <p className="text-xs text-gray-400 mb-1">Fuentes</p>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {player.links.slice(0, 2).map((link, i) => (
              <li key={i} className="flex items-center gap-1">
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-azul hover:underline truncate">
                  <SourceLabel url={link.url} />
                </a>
                {link.official && <OfficialBadge />}
              </li>
            ))}
            {player.links.length > 2 && (
              <li className="text-gray-400">+{player.links.length - 2} más</li>
            )}
          </ul>
        </div>
      )}

      {prevMarkets.length > 0 && (
        <div className="pt-1 border-t border-gray-100">
          <p className="text-xs text-amber-600 font-semibold mb-1">También sonó en:</p>
          <ul className="text-xs text-gray-600 space-y-0.5">
            {prevMarkets.map((name, i) => (
              <li key={i} className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full inline-block mr-1 mb-1">
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StadiumBlock() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStadium()
      .then((res) => setData(res.data?.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!data?.stadium) return null;

  const { stadium } = data;
  const sectors = stadium.sectors || [];
  const totalCapacity = sectors.reduce((sum, s) => sum + (s.capacity || 0), 0);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">{stadium.name}</h3>
        {totalCapacity > 0 && (
          <span className="text-sm font-mono text-gray-600">
            {totalCapacity.toLocaleString('es-AR')} espectadores
          </span>
        )}
      </div>

      {sectors.length > 0 && (
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500 uppercase">
              <th className="pb-2 pr-4">Sector</th>
              <th className="pb-2 text-right">Capacidad</th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((s) => (
              <tr key={s.id} className="border-b border-gray-100">
                <td className="py-2 pr-4">{s.name}</td>
                <td className="py-2 text-right font-mono text-gray-700">
                  {s.capacity !== null ? s.capacity.toLocaleString('es-AR') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {stadium.link && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">Fuente:</span>
          <a href={stadium.link} target="_blank" rel="noopener noreferrer" className="text-azul hover:underline">
            <SourceLabel url={stadium.link} />
          </a>
          {stadium.link_official ? (
            <OfficialBadge />
          ) : (
            <span className="text-gray-400 italic">No oficial</span>
          )}
        </div>
      )}
    </div>
  );
}

function ContactForm() {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null); // null | 'sending' | 'ok' | 'error'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      await sendContact({ message, email: email || undefined });
      setStatus('ok');
      setMessage('');
      setEmail('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-2">
      <p className="text-sm text-gray-500">
        ¿Tenés información, una corrección o un comentario? Envialo acá.
      </p>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        minLength={10}
        maxLength={2000}
        rows={4}
        placeholder="Tu mensaje..."
        className="w-full text-sm border border-gray-200 rounded p-2 resize-none focus:outline-none focus:ring-1 focus:ring-azul"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Tu email (opcional)"
        className="w-full text-sm border border-gray-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-azul"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === 'sending'}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {status === 'sending' ? 'Enviando...' : 'Enviar'}
        </button>
        {status === 'ok' && <span className="text-sm text-green-600">¡Mensaje enviado!</span>}
        {status === 'error' && <span className="text-sm text-red-600">No se pudo enviar. Intentá más tarde.</span>}
      </div>
    </form>
  );
}

export default function HomePage() {
  const [vigencia, setVigencia] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [contracts, setContracts] = useState([]);
  const [contractTotals, setContractTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rights, setRights] = useState([]);
  const [rightsLoading, setRightsLoading] = useState(false);
  const [rumors, setRumors] = useState([]);
  const [rumoresLoading, setRumoresLoading] = useState(false);
  const [activeMarket, setActiveMarket] = useState(null);
  const [activeRumorRole, setActiveRumorRole] = useState(null);
  const [electionLists, setElectionLists] = useState([]);
  const [electionsLoading, setElectionsLoading] = useState(false);
  const [selectedElectionList, setSelectedElectionList] = useState(null);
  const [showElectionMethodology, setShowElectionMethodology] = useState(false);
  const [selectedContractPlayer, setSelectedContractPlayer] = useState(null);
  const [selectedRumorPlayer, setSelectedRumorPlayer] = useState(null);
  const [recentMoves, setRecentMoves] = useState({ altas: [], bajas: [] });
  const [moveFilter, setMoveFilter] = useState(null);
  const { sections } = useSectionSettings();
  const rumoresCarousel = useDragScroll();
  const eleccionesCarousel = useDragScroll();
  const contratosCarousel = useDragScroll();
  const derechosCarousel = useDragScroll();

  const fetchContracts = useCallback(() => {
    setLoading(true);
    getContracts({ per_page: 100, sort_dir: 'asc', status: 'vigente' })
      .then((res) => {
        setContracts(res.data.data || []);
        setContractTotals(res.data.totals || null);
      })
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, []);

  usePageMeta({
    title: 'Números Azules - Portal de datos del Club Atlético Boca Juniors',
    description: 'Portal de transparencia económica y deportiva del Club Atlético Boca Juniors. Contratos de jugadores, compromisos económicos, deudas, balances oficiales y estadísticas.',
    path: '/',
  });

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  useEffect(() => {
    setRightsLoading(true);
    getRights({ per_page: 100 })
      .then((res) => setRights(res.data.data || []))
      .catch(() => setRights([]))
      .finally(() => setRightsLoading(false));
  }, []);

  useEffect(() => {
    if (sections.section_contratos_enabled === false) return;
    getContractRecentMoves()
      .then((res) => setRecentMoves(res.data.data || { altas: [], bajas: [] }))
      .catch(() => setRecentMoves({ altas: [], bajas: [] }));
  }, [sections.section_contratos_enabled]);

  useEffect(() => {
    if (sections.section_rumores_enabled !== true) return;
    setRumoresLoading(true);
    getRumors({ per_page: 100 })
      .then((res) => {
        setRumors(res.data.data || []);
        setActiveMarket(res.data.active_market || null);
      })
      .catch(() => setRumors([]))
      .finally(() => setRumoresLoading(false));
  }, [sections.section_rumores_enabled]);

  useEffect(() => {
    if (sections.section_elecciones_enabled !== true) return;
    setElectionsLoading(true);
    getElections()
      .then((res) => {
        const shuffled = [...(res.data.data || [])];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setElectionLists(shuffled);
      })
      .catch(() => setElectionLists([]))
      .finally(() => setElectionsLoading(false));
  }, [sections.section_elecciones_enabled]);

  const filteredContracts = useMemo(() => {
    let result = contracts;

    result = result.filter((c) => {
      const days = getDaysUntil(c.expiration_date);
      return days > -30;
    });

    if (searchInput.trim()) {
      const normalize = (str) =>
        str?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ?? '';
      const query = normalize(searchInput);
      result = result.filter(
        (c) =>
          normalize(c.full_name).includes(query) ||
          normalize(c.club_name).includes(query)
      );
    }

    if (vigencia) {
      const option = VIGENCIA_OPTIONS.find((o) => o.value === vigencia);
      if (option) {
        result = result.filter((c) => {
          const days = getDaysUntil(c.expiration_date);
          return days >= 0 && days <= option.days;
        });
      }
    }

    return result;
  }, [contracts, searchInput, vigencia]);

  const rumorsByRole = useMemo(
    () =>
      RUMOR_ROLE_ORDER.reduce((acc, role) => {
        acc[role] = rumors.filter((r) => String(r.role) === role);
        return acc;
      }, {}),
    [rumors]
  );
  const rolesWithRumors = RUMOR_ROLE_ORDER.filter((r) => (rumorsByRole[r] || []).length > 0);
  const displayedRumors = activeRumorRole !== null ? (rumorsByRole[activeRumorRole] || []) : rumors;

  const handleVigenciaClick = (value) => {
    setVigencia(vigencia === value ? '' : value);
  };

  const handleClear = () => {
    setSearchInput('');
    setVigencia('');
  };

  return (
    <>
    <PlayerMatchesModal player={selectedContractPlayer} showContract={true} onClose={() => setSelectedContractPlayer(null)} />
    <PlayerMatchesModal player={selectedRumorPlayer} showContract={false} onClose={() => setSelectedRumorPlayer(null)} comparePool={selectedRumorPlayer?.role != null ? rumors.filter((r) => r.role === selectedRumorPlayer.role) : rumors} />
    <ElectionListModal list={selectedElectionList} onClose={() => setSelectedElectionList(null)} />
    <ElectionMethodologyModal open={showElectionMethodology} onClose={() => setShowElectionMethodology(false)} />
    <div>
      {/* Hero */}
      <section className="bg-azul text-white py-10 md:py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-2xl md:text-4xl font-extrabold mb-3 leading-tight">
            Los datos que todo socio de<br />Boca Juniors tiene que saber
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-2xl mx-auto mb-4">
            Centralizados, simples y concretos.
          </p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-xs text-white/60">Compartir</span>
            <a
              href={`https://wa.me/?text=${encodeURIComponent('Los datos económicos y deportivos de Boca Juniors, centralizados: contratos, deudas, balances y más. Todo en Números Azules 👉 https://www.numerosazules.net')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-green-400 transition-colors"
              aria-label="Compartir por WhatsApp"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
            <a
              href={`https://x.com/intent/tweet?text=${encodeURIComponent('Los datos que todo socio de Boca Juniors tiene que saber: contratos, deudas, balances y más. Vía @NumerosAzules 👉 https://www.numerosazules.net')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white transition-colors"
              aria-label="Compartir en X"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Rumores del mercado */}
      {sections.section_rumores_enabled === true && (
      <section id="rumores" className="max-w-6xl mx-auto px-4 py-4">
        <div className="card overflow-hidden">
          <div className="mb-4">
            <h2 className="text-xl font-bold">Rumores del mercado</h2>
            {activeMarket && (
              <span className="text-sm text-gray-500 font-medium">{activeMarket.name}</span>
            )}
          </div>
          <p className="text-sm text-gray-500 -mt-2 mb-4">Las estadísticas de los jugadores mencionados como posibles refuerzos</p>

          {rumoresLoading ? (
            <div className="py-12">
              <Loader />
            </div>
          ) : rumors.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No hay rumores registrados.
            </div>
          ) : (
            <>
              {rolesWithRumors.length > 0 && (
                <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                  {rolesWithRumors.map((role) => (
                    <button
                      key={role}
                      onClick={() => setActiveRumorRole(activeRumorRole === role ? null : role)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        activeRumorRole === role
                          ? 'bg-azul text-white border-azul'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-azul/40 hover:text-azul'
                      }`}
                    >
                      {RUMOR_ROLE_LABELS[role]}
                      <span className="ml-1 opacity-70">({rumorsByRole[role].length})</span>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-sm text-gray-500 mb-3">{displayedRumors.length} jugadores</p>
              <div
                ref={rumoresCarousel.ref}
                className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory cursor-grab select-none"
                onMouseDown={rumoresCarousel.onMouseDown}
                onMouseUp={rumoresCarousel.onMouseUp}
                onMouseLeave={rumoresCarousel.onMouseLeave}
                onMouseMove={rumoresCarousel.onMouseMove}
              >
                {displayedRumors.map((r) => (
                  <PlayerCard
                    key={r.id}
                    player={r}
                    showPositions={true}
                    onClick={r.external_id ? () => setSelectedRumorPlayer({ id: r.external_id, nick: r.full_name, image: r.player_avatar, role: r.role }) : undefined}
                  />
                ))}
              </div>
            </>
          )}

          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs text-gray-400">Compartir</span>
            <a
              href={`https://wa.me/?text=${encodeURIComponent('¡Mirá los jugadores que suenan para Boca Juniors! Datos y estadísticas en Números Azules 👉 https://www.numerosazules.net/#rumores')}`}
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
              href={`https://x.com/intent/tweet?text=${encodeURIComponent('Los rumores de refuerzos de Boca Juniors con estadísticas reales. Vía @NumerosAzules 👉 https://www.numerosazules.net/#rumores')}`}
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
        </div>
      </section>
      )}

      {/* Elecciones */}
      {sections.section_elecciones_enabled === true && (
      <section id="elecciones" className="max-w-6xl mx-auto px-4 py-4">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Elecciones</h2>
            <Link to="/elecciones" className="text-sm text-azul hover:underline font-medium">
              Ver todos &rarr;
            </Link>
          </div>
          <p className="text-sm text-gray-500 -mt-2 mb-1">Las listas que se postulan, sus candidatos, propuestas, compromisos y metas</p>
          <button
            type="button"
            onClick={() => setShowElectionMethodology(true)}
            className="text-xs text-azul hover:underline font-medium mb-4 inline-flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10A8 8 0 112 10a8 8 0 0116 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9zm1-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
            </svg>
            Metodología
          </button>

          {electionsLoading ? (
            <div className="py-12">
              <Loader />
            </div>
          ) : electionLists.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No hay listas registradas.
            </div>
          ) : (
            <div
              ref={eleccionesCarousel.ref}
              className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory cursor-grab select-none"
              onMouseDown={eleccionesCarousel.onMouseDown}
              onMouseUp={eleccionesCarousel.onMouseUp}
              onMouseLeave={eleccionesCarousel.onMouseLeave}
              onMouseMove={eleccionesCarousel.onMouseMove}
            >
              {electionLists.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedElectionList(l)}
                  className="flex-shrink-0 w-40 snap-start flex flex-col items-center text-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-azul/40 hover:shadow-sm transition-all bg-white"
                >
                  {l.has_logo ? (
                    <img src={getElectionListLogoUrl(l.id)} alt={l.name} className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100" />
                  )}
                  <p className="text-sm font-semibold leading-tight">{l.name}</p>
                  <p className="text-xs text-gray-400">{(l.candidates || []).length} candidatos</p>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs text-gray-400">Compartir</span>
            <a
              href={`https://wa.me/?text=${encodeURIComponent('¡Mirá las listas, candidatos y propuestas para las elecciones de Boca Juniors! Todo en Números Azules 👉 https://www.numerosazules.net/#elecciones')}`}
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
              href={`https://x.com/intent/tweet?text=${encodeURIComponent('Las listas, candidatos y propuestas para las elecciones de Boca Juniors. Vía @NumerosAzules 👉 https://www.numerosazules.net/#elecciones')}`}
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
        </div>
      </section>
      )}

      {/* Monthly income/expense chart */}
      {sections.section_economia_enabled !== false && (
        <section id="compromisos-economicos" className="max-w-6xl mx-auto px-4 py-4">
          <MonthlyBarChart />
        </section>
      )}

      {/* Contracts carousel */}
      {sections.section_contratos_enabled !== false && (<>
      <section id="contratos" className="max-w-6xl mx-auto px-4 py-4">
        <div className="card overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h2 className="text-xl font-bold">Contratos del plantel</h2>
            <Link to="/contratos" className="text-sm text-azul hover:underline font-medium">
              Ver todos →
            </Link>
          </div>

          <ContractWidgets stats={contractTotals} />

          {/* Últimas novedades */}
          {(() => {
            const allMoves = [
              ...recentMoves.altas.map((c) => ({ ...c, tipo: 'alta', _date: c.signing_date || c.loan_return_date })),
              ...recentMoves.bajas.map((c) => ({ ...c, tipo: 'baja', _date: c.termination_date || c.loan_date })),
            ].sort((a, b) => new Date(b._date) - new Date(a._date));

            if (allMoves.length === 0) return null;

            const combinedMoves = moveFilter ? allMoves.filter((m) => m.tipo === moveFilter) : allMoves;

            return (
              <div className="mb-5">
                <p className="text-xs font-medium text-gray-500 mb-2">Últimas novedades</p>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setMoveFilter(moveFilter === 'alta' ? null : 'alta')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                      moveFilter === 'alta'
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-green-400 hover:text-green-700'
                    }`}
                  >
                    Altas
                  </button>
                  <button
                    onClick={() => setMoveFilter(moveFilter === 'baja' ? null : 'baja')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                      moveFilter === 'baja'
                        ? 'bg-azul text-white border-azul'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-azul/40 hover:text-azul'
                    }`}
                  >
                    Bajas
                  </button>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-1">
                  {combinedMoves.map((item) => (
                    <div
                      key={`${item.tipo}-${item.id}`}
                      onClick={item.external_id ? () => setSelectedContractPlayer({ id: item.external_id, nick: item.full_name, image: item.player_avatar }) : undefined}
                      className={`flex flex-col items-center gap-1.5 flex-shrink-0 w-24 group ${item.external_id ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="relative">
                        <img
                          src={item.player_avatar || '/default-avatar.svg'}
                          alt={item.full_name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-100 group-hover:border-azul transition-colors"
                          onError={(e) => { e.target.src = '/default-avatar.svg'; }}
                        />
                        <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase whitespace-nowrap ${
                          item.tipo === 'alta' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-azul'
                        }`}>
                          {item.tipo === 'alta' ? 'Alta' : 'Baja'}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-700 text-center leading-tight w-full truncate mt-1">{item.full_name}</span>
                      <span className="text-xs text-gray-400 font-mono">{formatDate(item._date)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Vigencia buttons */}
          <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">Vencimiento</p>
          <div className="flex gap-2 flex-wrap">
            {VIGENCIA_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleVigenciaClick(opt.value)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                  vigencia === opt.value
                    ? 'bg-azul text-white border-azul'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-azul/40 hover:text-azul'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          </div>

          {/* Search bar */}
          <form onSubmit={(e) => e.preventDefault()} className="flex gap-2 mb-6">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar jugador..."
              className="input-field flex-1"
            />
            {(vigencia || searchInput) && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 text-gray-500 hover:bg-gray-200 border border-transparent transition-all whitespace-nowrap"
              >
                Limpiar
              </button>
            )}
          </form>

          {loading ? (
            <div className="py-12">
              <Loader />
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No se encontraron contratos con los filtros seleccionados.
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-3">{filteredContracts.length} contratos encontrados</p>
              <div
                ref={contratosCarousel.ref}
                className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory cursor-grab select-none"
                onMouseDown={contratosCarousel.onMouseDown}
                onMouseUp={contratosCarousel.onMouseUp}
                onMouseLeave={contratosCarousel.onMouseLeave}
                onMouseMove={contratosCarousel.onMouseMove}
              >
                {filteredContracts.map((c) => (
                  <ContractCard
                    key={c.id}
                    contract={c}
                    onClick={c.external_id ? () => setSelectedContractPlayer({ id: c.external_id, nick: c.full_name, image: c.player_avatar }) : undefined}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        </section>

      </>)}

      {/* Derechos carousel */}
      {sections.section_derechos_enabled !== false && (
      <section id="derechos" className="max-w-6xl mx-auto px-4 py-4">
        <div className="card overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <h2 className="text-xl font-bold">Derechos sobre jugadores</h2>
            <Link to="/derechos" className="text-sm text-azul hover:underline font-medium">
              Ver todos →
            </Link>
          </div>
          <p className="text-sm text-gray-500 -mt-2 mb-4">No incluye derechos de formación</p>

          {rightsLoading ? (
            <div className="py-12">
              <Loader />
            </div>
          ) : rights.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No hay derechos registrados.
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-3">{rights.length} jugadores</p>
              <div
                ref={derechosCarousel.ref}
                className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory cursor-grab select-none"
                onMouseDown={derechosCarousel.onMouseDown}
                onMouseUp={derechosCarousel.onMouseUp}
                onMouseLeave={derechosCarousel.onMouseLeave}
                onMouseMove={derechosCarousel.onMouseMove}
              >
                {rights.map((r) => (
                  <PlayerCard
                    key={r.id}
                    player={r}
                    showPositions={true}
                    onClick={r.external_id ? () => setSelectedRumorPlayer({ id: r.external_id, nick: r.full_name, image: r.player_avatar }) : undefined}
                  />
                ))}
              </div>
            </>
          )}

          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs text-gray-400">Compartir</span>
            <a
              href={`https://wa.me/?text=${encodeURIComponent('¡Mirá los derechos económicos que tiene Boca Juniors sobre sus jugadores! Datos en Números Azules 👉 https://www.numerosazules.net/#derechos')}`}
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
              href={`https://x.com/intent/tweet?text=${encodeURIComponent('Los derechos económicos de Boca Juniors sobre sus jugadores, con detalle por cada uno. Vía @NumerosAzules 👉 https://www.numerosazules.net/#derechos')}`}
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
        </div>
      </section>
      )}

      {/* Balances */}
      {sections.section_balances_enabled !== false && (
        <section id="balances" className="max-w-6xl mx-auto px-4 py-4">
          <div className="card overflow-hidden">
            <BalanceLineChart compact={true} showLink={true} />
          </div>
        </section>
      )}

      {/* Stats widget */}
      <section id="estadisticas" className="max-w-6xl mx-auto px-4 py-4">
        <div className="card overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <h2 className="text-xl font-bold">Estadísticas</h2>
              <Link to="/estadisticas" className="text-sm text-azul hover:underline font-medium">
                Ver todo →
              </Link>
            </div>
            <StatsWidget />
          </div>
      </section>

      {/* Estadio */}
      {sections.section_estadio_enabled !== false && (
        <section id="estadio" className="max-w-6xl mx-auto px-4 py-4">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Estadio</h2>
            </div>
            <StadiumBlock />
          </div>
        </section>
      )}

      {/* Dato fundamental */}
      <section className="bg-gray-900 py-10 md:py-14">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="w-10 h-1 bg-azul mx-auto mb-6 rounded-full"></div>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold text-white leading-snug mb-5">
            El Club Atlético Boca Juniors es una Asociación Civil. Sus autoridades son elegidas periódicamente por los socios.
          </p>
          <p className="text-sm md:text-base text-gray-400 italic">
            Este es el dato más importante de todos los que persisten en este sitio.
          </p>
          <div className="w-10 h-1 bg-azul mx-auto mt-6 rounded-full"></div>
        </div>
      </section>

      {/* Methodology */}
      <section id="metodologia" className="max-w-6xl mx-auto px-4 py-4">
        <div className="card overflow-hidden">
        <h2 className="text-xl font-bold mb-4">Metodología y Fuentes</h2>

        <div className="space-y-4">
        <section className="card">
          <p className="text-sm text-gray-600">
            Números Azules es un proyecto independiente de datos abiertos. No es un sitio
            oficial del Club Atlético Boca Juniors. No genera contenido propio.
            El objetivo es mantener un punto centralizado de datos, recopilando publicaciones
            oficiales y extraoficiales relacionadas con el club.
          </p>
        </section>

        <section className="card">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            Marca Oficial <OfficialBadge className="w-5 h-5" />
          </h3>
          <p className="text-sm text-gray-600">
            Los registros marcados con el ícono <OfficialBadge className="inline-block align-middle w-4 h-4" /> indican que la información fue confirmada
            directamente por el Club Atlético Boca Juniors o proviene de documentos oficiales.
            Los datos que no poseen esa marca tienen como fuente diversas publicaciones periodísticas.
          </p>
        </section>
        
        <section className="card">
          <h3 className="text-lg font-bold mb-3">Fuentes de datos</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>
              <strong>Economía y contratos:</strong> Publicaciones en las redes oficiales del club, 
              Balances y otros documentos oficiales, notas periodísticas de medios especializados
              y/o partidarios.
            </li>
            <li>
              <strong>Estadísticas:</strong> Las estadísticas deportivas son obtenidas de la API de 
              BeSoccer.
            </li>
          </ul>
        </section>

        <section className="card">
          <h3 className="text-lg font-bold mb-3">Actualización</h3>
          <p className="text-sm text-gray-600 mb-4">
            Los datos se actualizan manualmente de forma humana, con la ayuda de agentes de inteligencia artificial.
          </p>
          <ContactForm />
        </section>

        <section className="card border border-azul/20">
          <h3 className="text-lg font-bold mb-3">Proyecto replicable</h3>
          <p className="text-sm text-gray-600 mb-3">
            Números Azules es un proyecto de código abierto pensado para ser adaptado a otras
            instituciones. El repositorio se puede clonar, adaptar y distribuir libre bajo licencia MIT.
          </p>
          <a
            href="https://github.com/glesende/numeros-rojos"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-azul hover:text-azul-dark"
          >
            Ver repositorio en GitHub →
          </a>
        </section>
        </div>
        </div>
      </section>
    </div>
    </>
  );
}
