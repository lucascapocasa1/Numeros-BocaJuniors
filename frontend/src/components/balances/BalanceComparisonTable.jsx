import { useState, useEffect, useRef, useMemo } from 'react';
import { getBalance } from '../../api/endpoints';
import Loader from '../common/Loader';
import { balanceLineLabel } from '../../utils/balanceLabels';

function flattenLines(lines, result = []) {
  for (const line of lines) {
    result.push(line);
    if (line.children?.length) flattenLines(line.children, result);
  }
  return result;
}

function formatARS(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatUSD(amount, dollarRef) {
  return 'USD ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(amount / dollarRef);
}

// Build a merged tree from all selected balances so lines from any balance appear.
function buildMergedTree(cache, selectedIds) {
  const nodeMap = new Map(); // normalized_name -> node metadata
  const childrenMap = new Map(); // parent normalized_name -> ordered children normalized_names
  const childSet = new Set(); // normalized_names that are children of someone

  function collect(lines, parentNormalizedName) {
    for (const line of lines) {
      if (!line.normalized_name) continue;
      if (!nodeMap.has(line.normalized_name)) {
        nodeMap.set(line.normalized_name, {
          normalized_name: line.normalized_name,
          name: line.name,
          is_total: line.is_total,
          level: line.level,
          order: line.order,
        });
      }
      if (parentNormalizedName) {
        if (!childrenMap.has(parentNormalizedName)) childrenMap.set(parentNormalizedName, []);
        const siblings = childrenMap.get(parentNormalizedName);
        if (!siblings.includes(line.normalized_name)) siblings.push(line.normalized_name);
        childSet.add(line.normalized_name);
      }
      if (line.children?.length) collect(line.children, line.normalized_name);
    }
  }

  for (const id of selectedIds) {
    const balance = cache[id];
    if (!balance) continue;
    collect(balance.lines || [], null);
  }

  function buildNode(normalizedName) {
    const node = nodeMap.get(normalizedName);
    const childNames = childrenMap.get(normalizedName) || [];
    return {
      ...node,
      children: childNames.map(buildNode).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    };
  }

  const roots = [...nodeMap.keys()].filter((name) => !childSet.has(name));
  return roots.map(buildNode).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

// Recursive row: uses structureNode (merged from all balances) and looks up
// matching lines in each balance by normalized_name.
function ComparisonRow({ node, level, selectedIds, cache }) {
  const [open, setOpen] = useState(level < 2);
  const hasChildren = node.children?.length > 0;

  const values = selectedIds.map((id) => {
    const balance = cache[id];
    if (!balance) return null;
    const match = flattenLines(balance.lines || []).find(
      (l) => l.normalized_name && l.normalized_name === node.normalized_name
    );
    if (!match) return 'missing';
    if (match.amount == null) return null;
    return { amount: match.amount, dollarRef: balance.dollar_reference };
  });

  const allMissing = values.every((v) => v === 'missing' || v === null);

  return (
    <>
      <tr
        className={`border-b border-gray-100 transition-colors ${
          node.is_total ? 'bg-gray-50 font-bold' : 'hover:bg-gray-50/70'
        }`}
      >
        <td className="py-1.5 pr-4" style={{ paddingLeft: `${level * 18 + 8}px` }}>
          <button
            type="button"
            onClick={() => hasChildren && setOpen((o) => !o)}
            className={`flex items-center gap-1 text-left w-full ${
              hasChildren ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            {hasChildren ? (
              <span className="text-gray-400 text-xs w-3 flex-shrink-0">{open ? '▾' : '▸'}</span>
            ) : (
              <span className="w-3 flex-shrink-0" />
            )}
            <span
              className={
                level === 0
                  ? 'font-semibold text-gray-800'
                  : level === 1
                  ? 'text-gray-700'
                  : 'text-gray-600 text-sm'
              }
            >
              {balanceLineLabel(node.name)}
            </span>
          </button>
        </td>

        {values.map((val, vi) => (
          <td key={vi} className="py-1.5 px-2 text-right align-top min-w-[130px]">
            {val === 'missing' || val === null ? (
              <span className={allMissing ? 'text-gray-200' : 'text-gray-300'}>—</span>
            ) : (
              <>
                <span
                  className={`block font-mono text-sm ${
                    val.amount < 0 ? 'text-red-600' : 'text-gray-800'
                  }`}
                >
                  {formatARS(val.amount)}
                </span>
                {val.dollarRef > 0 && (
                  <span className="block text-xs text-gray-400 font-mono">
                    {formatUSD(val.amount, val.dollarRef)}
                  </span>
                )}
              </>
            )}
          </td>
        ))}
      </tr>

      {open &&
        hasChildren &&
        node.children.map((child) => (
          <ComparisonRow
            key={child.normalized_name}
            node={child}
            level={level + 1}
            selectedIds={selectedIds}
            cache={cache}
          />
        ))}
    </>
  );
}

export default function BalanceComparisonTable({ allBalances }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const pendingRef = useRef(new Set());

  // Init with 3 most recent on first load
  useEffect(() => {
    if (allBalances.length > 0 && selectedIds.length === 0) {
      setSelectedIds(allBalances.slice(0, 3).map((b) => b.id));
    }
  }, [allBalances]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch balance details for selected IDs not yet cached
  useEffect(() => {
    const toFetch = selectedIds.filter(
      (id) => id != null && !cache[id] && !pendingRef.current.has(id)
    );
    if (toFetch.length === 0) return;

    toFetch.forEach((id) => pendingRef.current.add(id));
    setLoading(true);

    Promise.all(toFetch.map((id) => getBalance(id).then((res) => ({ id, data: res.data?.data }))))
      .then((results) => {
        setCache((prev) => {
          const next = { ...prev };
          for (const { id, data } of results) next[id] = data;
          return next;
        });
      })
      .finally(() => {
        toFetch.forEach((id) => pendingRef.current.delete(id));
        setLoading(false);
      });
  }, [selectedIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (index, value) => {
    const newIds = [...selectedIds];
    newIds[index] = value ? Number(value) : null;
    setSelectedIds(newIds);
  };

  // Build a merged tree from ALL selected balances so every line appears regardless of which balance has it
  const mergedTree = useMemo(() => {
    const loadedIds = selectedIds.filter((id) => id != null && cache[id]);
    if (loadedIds.length === 0) return [];
    return buildMergedTree(cache, loadedIds);
  }, [cache, selectedIds]);

  const hasData = mergedTree.length > 0;

  if (allBalances.length < 2) return null;

  return (
    <div className="card mb-8">
      <h2 className="text-xl font-bold mb-4">Comparativa de balances</h2>

      {/* Balance selectors */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 min-w-[140px]">
            <label className="text-xs text-gray-500 mb-1 block">Balance {i + 1}</label>
            <select
              className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-azul/30"
              value={selectedIds[i] ?? ''}
              onChange={(e) => handleSelect(i, e.target.value)}
            >
              <option value="">— Sin selección —</option>
              {allBalances.map((b) => (
                <option key={b.id} value={b.id}>
                  Ejercicio {b.exercise}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {loading ? (
        <Loader />
      ) : !hasData ? (
        <p className="text-gray-400 text-sm text-center py-8">
          Seleccioná al menos un balance para ver la comparativa.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                <th className="pb-2 pr-4 text-left font-semibold pl-2">Concepto</th>
                {selectedIds.map((id, i) => {
                  const b = cache[id];
                  return (
                    <th key={i} className="pb-2 px-2 text-right font-semibold min-w-[130px]">
                      {b ? `Ej. ${b.exercise}` : id ? '…' : '—'}
                      {b?.dollar_reference > 0 && (
                        <div className="text-xs font-normal text-gray-400 normal-case tracking-normal mt-0.5">
                          USD 1 = ${Number(b.dollar_reference).toLocaleString('es-AR')}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {mergedTree.map((node) => (
                <ComparisonRow
                  key={node.normalized_name}
                  node={node}
                  level={0}
                  selectedIds={selectedIds}
                  cache={cache}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
