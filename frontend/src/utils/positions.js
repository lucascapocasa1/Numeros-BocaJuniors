// BeSoccer position codes → Spanish full names
// Covers Spanish abbreviations (primary BeSoccer format) and English codes (fallback)
const POSITION_LABELS = {
  // Spanish codes
  POR: 'Arquero',
  DC:  'Defensor central',
  LD:  'Lateral derecho',
  LI:  'Lateral izquierdo',
  CAD: 'Carrilero derecho',
  CAI: 'Carrilero izquierdo',
  MCD: 'Mediocampista defensivo',
  MC:  'Mediocampista central',
  MCO: 'Mediocampista ofensivo',
  MD:  'Mediocampista derecho',
  MI:  'Mediocampista izquierdo',
  ED:  'Extremo derecho',
  EI:  'Extremo izquierdo',
  SD:  'Segundo delantero',
  DL:  'Delantero',
  // English codes
  GK:  'Arquero',
  CB:  'Defensor central',
  RB:  'Lateral derecho',
  LB:  'Lateral izquierdo',
  RWB: 'Carrilero derecho',
  LWB: 'Carrilero izquierdo',
  CDM: 'Mediocampista defensivo',
  CM:  'Mediocampista central',
  CAM: 'Mediocampista ofensivo',
  RM:  'Mediocampista derecho',
  LM:  'Mediocampista izquierdo',
  RW:  'Extremo derecho',
  LW:  'Extremo izquierdo',
  SS:  'Segundo delantero',
  CF:  'Delantero centro',
  ST:  'Delantero',
  FW:  'Delantero',
};

export function translatePosition(code) {
  if (!code) return null;
  return POSITION_LABELS[code.toUpperCase()] ?? code;
}
