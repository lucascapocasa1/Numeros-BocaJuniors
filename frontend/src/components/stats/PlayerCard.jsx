import PlayerAvatar from '../PlayerAvatar';
import { translatePosition } from '../../utils/positions';

export default function PlayerCard({ player, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`card p-3 text-left w-full transition-all hover:shadow-md ${
        selected ? 'border-azul ring-1 ring-azul/30 bg-azul/5' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <PlayerAvatar src={player.image} alt={player.nick} className="w-12 h-12" />
          <span className="absolute -bottom-1 -right-1 bg-azul text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">
            {player.squadNumber || '?'}
          </span>
        </div>
        <div className="overflow-hidden min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{player.nick}</p>
          {player.pos1 && (
            <p className="text-xs text-gray-400 mt-0.5">{translatePosition(player.pos1)}</p>
          )}
          {player.birthdate && (
            <p className="text-xs text-gray-400">
              {new Date().getFullYear() - new Date(player.birthdate).getFullYear()} años
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
