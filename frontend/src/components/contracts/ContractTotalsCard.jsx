function formatAmount(amount, currency) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ContractTotalsCard({ totals }) {
  if (!totals) return null;

  const amounts = [
    { currency: 'ARS', value: totals.total_salarios_ars },
    { currency: 'USD', value: totals.total_salarios_usd },
    { currency: 'EUR', value: totals.total_salarios_eur },
  ].filter((a) => a.value);

  return (
    <div className="card mb-6">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center mb-3">Contratos filtrados</p>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center">
        <div>
          <p className="text-2xl font-bold text-gray-900">{totals.total_contratos}</p>
        </div>
      </div>
    </div>
  );
}
