import { useState, useEffect } from 'react';
import { getTeam } from '../api/endpoints';
import { usePageMeta } from '../hooks/usePageMeta';
import Loader from '../components/common/Loader';
import FormBadges from '../components/stats/FormBadges';
import PlayerCard from '../components/stats/PlayerCard';
import PlayerMatchesModal from '../components/stats/PlayerMatchesModal';

const ROLE_LABELS = { '1': 'Arqueros', '2': 'Defensores', '3': 'Mediocampistas', '4': 'Delanteros' };
const ROLE_ORDER = ['1', '2', '3', '4'];

function computePJ(row) {
  return ['win_h', 'draw_h', 'lose_h', 'win_a', 'draw_a', 'lose_a']
    .reduce((sum, k) => sum + (Number(row[k]) || 0), 0);
}

function StandingsTable({ tables, teamId }) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="text-left text-xs text-gray-400 border-b uppercase tracking-wide">
            <th className="pb-2 pr-2 w-8">#</th>
            <th className="pb-2 pr-4">Equipo</th>
            <th className="pb-2 text-center px-2">PJ</th>
            <th className="pb-2 text-center px-2">G</th>
            <th className="pb-2 text-center px-2">E</th>
            <th className="pb-2 text-center px-2">P</th>
            <th className="pb-2 text-center px-2">GF</th>
            <th className="pb-2 text-center px-2">GC</th>
            <th className="pb-2 text-center px-2 font-bold text-gray-600">Pts</th>
            <th className="pb-2 pl-2">Forma</th>
          </tr>
        </thead>
        <tbody>
          {tables.map((row) => {
            const isOurs = row.teamId === teamId;
            const pj = computePJ(row);
            const wins = Number(row.win_h) + Number(row.win_a);
            const draws = Number(row.draw_h) + Number(row.draw_a);
            const losses = Number(row.lose_h) + Number(row.lose_a);
            return (
              <tr
                key={row.team}
                className={`border-b last:border-0 ${
                  isOurs
                    ? 'bg-azul/5'
                    : 'hover:bg-gray-50'
                }`}
              >
                <td className="py-2 pr-2 text-gray-400 text-xs">{row.position}</td>
                <td className={`py-2 pr-4 font-medium ${isOurs ? 'text-azul font-bold' : ''}`}>
                  {row.nameShow}
                </td>
                <td className="py-2 text-center px-2 text-gray-500">{pj}</td>
                <td className="py-2 text-center px-2 text-ingreso font-medium">{wins}</td>
                <td className="py-2 text-center px-2 text-gray-400">{draws}</td>
                <td className="py-2 text-center px-2 text-egreso font-medium">{losses}</td>
                <td className="py-2 text-center px-2">{row.gf}</td>
                <td className="py-2 text-center px-2">{row.ga}</td>
                <td className="py-2 text-center px-2 font-bold">{row.points}</td>
                <td className="py-2 pl-2">
                  <FormBadges form={row.form} max={5} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function StatsPage() {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCompetition, setActiveCompetition] = useState(0);
  const [activeRole, setActiveRole] = useState('1');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  usePageMeta({
    title: 'Estadísticas del plantel de Boca Juniors | Números Azules',
    description: 'Tabla de posiciones y fichas estadísticas de los jugadores del plantel de Boca Juniors en el torneo actual.',
    path: '/estadisticas',
  });

  useEffect(() => {
    getTeam()
      .then((res) => {
        const data = res.data?.data?.team;
        if (data) {
          setTeam(data);
        } else {
          setError('No se pudieron obtener los datos del equipo.');
        }
      })
      .catch(() => setError('Servicio de estadísticas no disponible. Verificá la configuración de BeSoccer en el admin.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-20"><Loader /></div>;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <div className="card text-center py-12">
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  const competitions = team.competitions || [];
  const currentComp = competitions[activeCompetition];
  const isMainComp = currentComp?.id === team.category?.category_id;
  const myRow = team.tables?.find((t) => t.teamId === team.id);

  const wins = myRow ? Number(myRow.win_h) + Number(myRow.win_a) : 0;
  const draws = myRow ? Number(myRow.draw_h) + Number(myRow.draw_a) : 0;
  const losses = myRow ? Number(myRow.lose_h) + Number(myRow.lose_a) : 0;
  const pj = myRow ? computePJ(myRow) : 0;

  const squadByRole = ROLE_ORDER.reduce((acc, role) => {
    acc[role] = (team.squad || []).filter((p) => p.role === role);
    return acc;
  }, {});

  const rolesWithPlayers = ROLE_ORDER.filter((r) => squadByRole[r]?.length > 0);

  return (
    <div>
      <section className="max-w-6xl mx-auto px-4 pt-8 pb-0">
        <h1 className="text-2xl font-extrabold mb-1">Estadísticas</h1>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-400">Compartir</span>
          <a
            href="https://wa.me/?text=Mir%C3%A1%20las%20estad%C3%ADsticas%20de%20Boca%20Juniors%3A%20https%3A%2F%2Fwww.numerosazules.net%2Festadisticas"
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
            href="https://x.com/intent/tweet?text=Mir%C3%A1%20las%20estad%C3%ADsticas%20de%20Boca%20Juniors%3A%20https%3A%2F%2Fwww.numerosazules.net%2Festadisticas"
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
      </section>

      {/* Competition tabs */}
      <section className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {competitions.map((comp, i) => (
            <button
              key={`${comp.id}-${i}`}
              onClick={() => { setActiveCompetition(i); setSelectedPlayer(null); }}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                activeCompetition === i
                  ? 'bg-azul text-white border-azul'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-azul/40 hover:text-azul'
              }`}
            >
              <img src={comp.logo} alt="" className="h-4 w-auto" />
              {comp.name}
            </button>
          ))}
        </div>

        {/* Main competition: stats cards + form + standings */}
        {isMainComp && myRow && (
          <>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-5">
              {[
                { label: 'Posición', value: `${myRow.position}°`, highlight: true },
                { label: 'Puntos', value: myRow.points },
                { label: 'PJ', value: pj },
                { label: 'G / E / P', value: `${wins}/${draws}/${losses}` },
                { label: 'Goles a favor', value: myRow.gf },
                { label: 'Goles en contra', value: myRow.ga },
              ].map(({ label, value, highlight }) => (
                <div key={label} className="card text-center py-3 px-2">
                  <p className={`text-xl font-extrabold ${highlight ? 'text-azul' : ''}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="card mb-5">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
                Últimas {myRow.form?.length} fechas
              </p>
              <FormBadges form={myRow.form} max={10} />
            </div>

            <div className="card">
              <h2 className="font-bold mb-4">
                {team.category.cat_name} {team.category.year}
                <span className="text-sm text-gray-400 font-normal ml-2">
                  · Fecha {team.category.current_round}/{competitions[0]?.phases?.[0]?.total_rounds}
                </span>
              </h2>
              <StandingsTable tables={team.tables} teamId={team.id} />
            </div>
          </>
        )}

        {/* Other competitions: phase info */}
        {!isMainComp && currentComp && (
          <div className="card">
            <div className="flex items-center gap-3 mb-5">
              <img src={currentComp.logo} alt="" className="h-8 w-auto" />
              <div>
                <h2 className="font-bold">{currentComp.name} {currentComp.year}</h2>
              </div>
            </div>
            <div className="space-y-2">
              {currentComp.phases?.map((phase, i) => (
                <div key={i} className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-xl text-sm">
                  <span className="font-semibold">
                    {phase.type === 'playoffs' ? 'Playoffs' : 'Fase de grupos'}
                  </span>
                  {phase.is_current && (
                    <span className="text-xs bg-azul/10 text-azul px-2 py-0.5 rounded-full font-medium">
                      En curso
                    </span>
                  )}
                  <span className="text-gray-500">
                    Ronda {phase.current_round}/{phase.total_rounds} · {phase.total_teams} equipos
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Squad */}
      <section className="max-w-6xl mx-auto px-4 pb-14">
        <h2 className="text-xl font-bold mb-4">Plantel {team.category?.year}</h2>

        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
          {rolesWithPlayers.map((role) => (
            <button
              key={role}
              onClick={() => { setActiveRole(role); setSelectedPlayer(null); }}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                activeRole === role
                  ? 'bg-azul text-white border-azul'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-azul/40 hover:text-azul'
              }`}
            >
              {ROLE_LABELS[role]}
              <span className="ml-1.5 text-xs opacity-70">({squadByRole[role].length})</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {squadByRole[activeRole]?.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              selected={selectedPlayer?.id === player.id}
              onClick={() => setSelectedPlayer(player)}
            />
          ))}
        </div>
      </section>

      <PlayerMatchesModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </div>
  );
}
