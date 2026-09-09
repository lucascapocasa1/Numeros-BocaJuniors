import { useState, useEffect } from 'react';
import { getElectionCandidatePhotoUrl, getElectionCandidateCvUrl } from '../api/endpoints';

const TABS = [
  { key: 'propuestas', label: 'Propuestas' },
  { key: 'compromisos', label: 'Compromisos' },
  { key: 'metas', label: 'Metas' },
];

function metricLine(c) {
  const value = c.metric_value != null ? `${c.metric_value}${c.metric_unit ? ` ${c.metric_unit}` : ''}` : c.metric_unit;
  return [value, c.deadline].filter(Boolean).join(' · ');
}

function CommitmentList({ commitments }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {commitments.map((c) => (
        <li key={c.id} className="flex items-start gap-2 text-sm font-bold text-gray-900 bg-red-50 rounded-lg px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-azul shrink-0 mt-1.5" aria-hidden="true" />
          <span>{c.description}</span>
        </li>
      ))}
    </ul>
  );
}

function GoalList({ goals }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {goals.map((c) => {
        const metric = metricLine(c);
        return (
          <li key={c.id} className="flex items-start gap-2 text-sm font-bold text-gray-900 bg-amber-50 rounded-lg px-3 py-2">
            <svg
              className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 2a1 1 0 011 1v.09a7.002 7.002 0 015.91 5.91H17a1 1 0 110 2h-.09A7.002 7.002 0 0111 16.91V17a1 1 0 11-2 0v-.09A7.002 7.002 0 013.09 11H3a1 1 0 110-2h.09A7.002 7.002 0 019 3.09V3a1 1 0 011-1zm0 3a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6zm0 2a1 1 0 100 2 1 1 0 000-2z"
                clipRule="evenodd"
              />
            </svg>
            <span>
              {c.description}
              {metric && <span className="block text-xs font-semibold text-amber-700 mt-0.5">{metric}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function ElectionListContent({ list, showNoCommitmentsReason = false }) {
  const [tab, setTab] = useState('propuestas');

  useEffect(() => {
    setTab('propuestas');
  }, [list?.id]);

  const candidates = list.candidates || [];
  const proposals = list.proposals || [];

  const withKind = (kind) =>
    proposals
      .map((p) => ({ ...p, commitments: (p.commitments || []).filter((c) => (c.kind || 'compromiso') === kind) }))
      .filter((p) => p.commitments.length > 0);

  const proposalsWithCommitments = withKind('compromiso');
  const proposalsWithGoals = withKind('meta');

  return (
    <div className="space-y-6">
      {list.source_url && (
        <p className="text-xs text-gray-400">
          Fuente:{' '}
          <a
            href={list.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-azul hover:underline break-all"
          >
            {list.source_url}
          </a>
        </p>
      )}

      {/* Candidates */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3">Candidatos</h3>
        {candidates.length === 0 ? (
          <p className="text-sm text-gray-400">No hay candidatos cargados.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {candidates.map((c) => (
              <div key={c.id} className="flex flex-col items-center text-center gap-1.5 p-2 rounded-lg bg-gray-50">
                {c.has_photo ? (
                  <img
                    src={getElectionCandidatePhotoUrl(c.id)}
                    alt={`${c.first_name} ${c.last_name}`}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-200" />
                )}
                <p className="text-xs font-semibold leading-tight">{c.first_name} {c.last_name}</p>
                <p className="text-[11px] text-gray-500 leading-tight">{c.position}</p>
                {c.has_cv && (
                  <a
                    href={getElectionCandidateCvUrl(c.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-azul hover:underline font-medium"
                  >
                    Ver CV
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Proposals / Commitments / Goals tabs */}
      <div>
        <div className="flex border-b mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-azul text-azul'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'propuestas' && (
          proposals.length === 0 ? (
            <p className="text-sm text-gray-400">No hay propuestas cargadas.</p>
          ) : (
            <ul className="space-y-4">
              {proposals.map((p) => {
                const commitments = (p.commitments || []).filter((c) => (c.kind || 'compromiso') === 'compromiso');
                const goals = (p.commitments || []).filter((c) => c.kind === 'meta');
                const hasNone = commitments.length === 0 && goals.length === 0;
                return (
                  <li key={p.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <p className="text-sm font-semibold">{p.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{p.description}</p>
                    {goals.length > 0 && <GoalList goals={goals} />}
                    {commitments.length > 0 && <CommitmentList commitments={commitments} />}
                    {showNoCommitmentsReason && hasNone && p.no_commitments_reason && (
                      <p className="mt-2 text-xs text-gray-400 italic">
                        Sin compromisos ni metas: {p.no_commitments_reason}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )
        )}

        {tab === 'compromisos' && (
          proposalsWithCommitments.length === 0 ? (
            <p className="text-sm text-gray-400">No hay compromisos detectados.</p>
          ) : (
            <ul className="space-y-4">
              {proposalsWithCommitments.map((p) => (
                <li key={p.id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{p.title}</p>
                  <CommitmentList commitments={p.commitments} />
                </li>
              ))}
            </ul>
          )
        )}

        {tab === 'metas' && (
          proposalsWithGoals.length === 0 ? (
            <p className="text-sm text-gray-400">No hay metas detectadas.</p>
          ) : (
            <ul className="space-y-4">
              {proposalsWithGoals.map((p) => (
                <li key={p.id}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{p.title}</p>
                  <GoalList goals={p.commitments} />
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  );
}
