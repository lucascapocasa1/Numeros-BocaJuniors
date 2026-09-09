import { useState } from 'react';
import { balanceLineLabel } from '../../utils/balanceLabels';

/**
 * BalanceLinesTree
 *
 * Renders a hierarchical balance tree.
 *
 * Props:
 * - lines:    array of nested line objects (each with id, name, amount, currency, is_total, children[])
 * - currency: display currency label (e.g. 'ARS')
 */

function LineRow({ node, level = 0 }) {
  const [open, setOpen] = useState(level < 2);
  const hasChildren = node.children?.length > 0;

  const formatMoney = (amount) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: node.currency || 'ARS',
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <>
      <tr
        className={`border-b transition-colors ${
          node.is_total
            ? 'bg-gray-50 font-bold'
            : level === 0
            ? 'hover:bg-gray-50'
            : 'hover:bg-gray-50'
        }`}
      >
        <td
          className="py-2 pr-4"
          style={{ paddingLeft: `${level * 18 + 8}px` }}
        >
          <button
            type="button"
            onClick={() => hasChildren && setOpen((o) => !o)}
            className={`flex items-center gap-1 text-left w-full ${hasChildren ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {hasChildren && (
              <span className="text-gray-400 text-xs w-3 flex-shrink-0">{open ? '▾' : '▸'}</span>
            )}
            {!hasChildren && <span className="w-3 flex-shrink-0" />}
            <span className={level === 0 ? 'font-semibold text-gray-800' : level === 1 ? 'text-gray-700' : 'text-gray-600 text-sm'}>
              {balanceLineLabel(node.name)}
            </span>
          </button>
        </td>
        <td className="py-2 text-right font-mono">
          {node.amount != null ? (
            <span className={Number(node.amount) < 0 ? 'text-red-600' : 'text-gray-800'}>
              {formatMoney(node.amount)}
            </span>
          ) : null}
        </td>
      </tr>
      {open && hasChildren && node.children.map((child) => (
        <LineRow key={child.id} node={child} level={level + 1} />
      ))}
    </>
  );
}

export default function BalanceBreakdownTable({ lines = [] }) {
  if (lines.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No hay desglose disponible para este balance.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="pb-2 pr-4 font-semibold pl-2">Concepto</th>
            <th className="pb-2 text-right font-semibold">Monto</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <LineRow key={line.id} node={line} level={0} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
