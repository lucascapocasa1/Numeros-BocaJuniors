import { useState, useEffect } from 'react';
import { getSectionSettings } from '../api/endpoints';

const DEFAULT_SECTIONS = {
  section_economia_enabled: true,
  section_contratos_enabled: true,
  section_balances_enabled: true,
};

export default function useSectionSettings() {
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSectionSettings()
      .then((res) => {
        setSections({ ...DEFAULT_SECTIONS, ...(res.data?.data || {}) });
      })
      .catch(() => {
        // On error, default to all sections enabled
      })
      .finally(() => setLoaded(true));
  }, []);

  return { sections, loaded };
}
