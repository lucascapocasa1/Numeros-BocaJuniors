import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../../api/endpoints';

export default function SectionEnableToggle({ settingKey }) {
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSettings()
      .then((res) => {
        const value = res.data?.data?.[settingKey];
        setEnabled(value === undefined || value === '1' || value === true);
      })
      .catch(() => setEnabled(true))
      .finally(() => setLoaded(true));
  }, [settingKey]);

  const handleChange = async (e) => {
    const newValue = e.target.checked;
    setEnabled(newValue);
    setSaving(true);
    try {
      await updateSettings({ [settingKey]: newValue });
    } catch {
      setEnabled(!newValue);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <div className="card mb-6 flex items-center justify-between gap-4 py-3 px-4 bg-gray-50 border border-gray-200">
      <div>
        <p className="font-semibold text-sm text-gray-800">Sección habilitada en la landing</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {enabled
            ? 'Esta sección se muestra en la landing y en el menú de navegación.'
            : 'Esta sección está oculta en la landing y en el menú de navegación.'}
        </p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={enabled}
          onChange={handleChange}
          disabled={saving}
        />
        <div className={`w-11 h-6 rounded-full peer transition-colors ${
          enabled ? 'bg-azul' : 'bg-gray-300'
        } peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-azul/30 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all ${
          enabled ? 'after:translate-x-5' : ''
        }`} />
      </label>
    </div>
  );
}
