function formatAmount(amount, currency) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function EconomyTotalsCard({ totals }) {
  if (!totals) return null;

  const amounts = [
    { currency: 'ARS', balance: totals.balance_ars, cobros: totals.total_cobros_ars, pagos: totals.total_pagos_ars },
    { currency: 'USD', balance: totals.balance_usd, cobros: totals.total_cobros_usd, pagos: totals.total_pagos_usd },
    { currency: 'EUR', balance: totals.balance_eur, cobros: totals.total_cobros_eur, pagos: totals.total_pagos_eur },
  ].filter((a) => a.cobros || a.pagos);

  return (
    <div className="card mb-6">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center mb-3">Totales filtrados</p>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center">
        {amounts.map((a) => (
          <div key={a.currency}>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{a.currency}</p>
            <p className="text-2xl font-bold text-gray-900">{formatAmount(a.balance, a.currency)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
