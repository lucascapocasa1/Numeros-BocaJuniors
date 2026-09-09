const BALANCE_LABEL_MAP = {
  situacion_patrimonial: 'Situación Patrimonial',
  resultados: 'Resultados',
  patrimonio_neto: 'Patrimonio Neto',
  estado_flujo: 'Estado de Flujo de Efectivo',
};

/**
 * Returns a human-readable label for a balance line name.
 * If the name matches a known normalized key, returns the proper label.
 * Otherwise returns the name as-is.
 */
export function balanceLineLabel(name) {
  if (!name) return name;
  const key = name.toLowerCase().replace(/\s+/g, '_');
  return BALANCE_LABEL_MAP[key] ?? name;
}
