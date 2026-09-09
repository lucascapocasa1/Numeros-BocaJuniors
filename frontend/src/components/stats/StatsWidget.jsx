import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTeam } from '../../api/endpoints';
import FormBadges from './FormBadges';
import PlayerCard from './PlayerCard';
import PlayerMatchesModal from './PlayerMatchesModal';

const ROLE_LABELS = { '1': 'Arqueros', '2': 'Defensores', '3': 'Mediocampistas', '4': 'Delanteros' };
const ROLE_ORDER = ['1', '2', '3', '4'];

export default function StatsWidget() {
  const [team, setTeam] = useState(null);
  const [activeRole, setActiveRole] = useState('1');
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    getTeam()
      .then((res) => {
        const data = res.data?.data?.team;
        if (data?.tables) setTeam(data);
      })
      .catch(() => {});
  }, []);

  if (!team) return null;

  const competition = team.category;
  const myRow = team.tables?.find((t) => t.teamId === team.id);

  if (!myRow || !competition) return null;

  const squadByRole = ROLE_ORDER.reduce((acc, role) => {
    acc[role] = (team.squad || []).filter((p) => p.role === role);
    return acc;
  }, {});
  const rolesWithPlayers = ROLE_ORDER.filter((r) => squadByRole[r]?.length > 0);

  // Set initial active role to first role that has players
  const effectiveRole = squadByRole[activeRole]?.length > 0 ? activeRole : rolesWithPlayers[0];

  return (
    <>
      <div className="card">
        {/* Header: competition + link */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {competition.league_logo && (
              <img src={competition.league_logo} alt="" className="h-5 w-auto" />
            )}
            <h3 className="font-bold text-sm">{competition.cat_name} {competition.year}</h3>
            <span className="text-xs text-gray-400 hidden sm:inline">· Fecha {competition.current_round}</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-3xl font-extrabold text-azul leading-none">{myRow.position}°</p>
            <p className="text-xs text-gray-500 mt-1">Posición</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-3xl font-extrabold leading-none">{myRow.points}</p>
            <p className="text-xs text-gray-500 mt-1">Puntos</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-xl">
            <p className="text-xl font-bold leading-none">
              {myRow.gf}
              <span className="text-gray-300 mx-1">–</span>
              {myRow.ga}
            </p>
            <p className="text-xs text-gray-500 mt-1">GF / GC</p>
          </div>
          <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-xl gap-2">
            <FormBadges form={myRow.form} max={5} />
            <p className="text-xs text-gray-500">Últimos 5</p>
          </div>
        </div>

        {/* Squad */}
        <div className="border-t pt-5">
          <h4 className="font-bold text-sm mb-3">Plantel {competition.year}</h4>

          {/* Role tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            {rolesWithPlayers.map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  effectiveRole === role
                    ? 'bg-azul text-white border-azul'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-azul/40 hover:text-azul'
                }`}
              >
                {ROLE_LABELS[role]}
                <span className="ml-1 opacity-70">({squadByRole[role].length})</span>
              </button>
            ))}
          </div>

          {/* Player grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {squadByRole[effectiveRole]?.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                selected={selectedPlayer?.id === player.id}
                onClick={() => setSelectedPlayer(player)}
              />
            ))}
          </div>
        </div>
      </div>

      <PlayerMatchesModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </>
  );
}
