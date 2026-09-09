import { useState, useEffect } from 'react';
import { getBalanceAllItems, getSettings, updateSettings } from '../../api/endpoints';
import Loader from '../common/Loader';
import { LINE_COLORS } from '../../constants/chartColors';

function ItemCheckboxList({ items, selected, onToggle, colorIndexMap = null }) {
  return (
    <div className="grid sm:grid-cols-2 gap-1">
      {items.map((item, idx) => {
        const colorIdx = colorIndexMap ? (colorIndexMap[item.id] ?? idx) : idx;
        const color = LINE_COLORS[colorIdx % LINE_COLORS.length];
        const active = selected.includes(item.id);
        return (
          <label
            key={item.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer select-none"
          >
            <div
              className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
              style={
                active
                  ? { backgroundColor: color, borderColor: color }
                  : { borderColor: '#d1d5db' }
              }
            >
              {active && (
                <svg
                  className="w-2.5 h-2.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <input
              type="checkbox"
              className="sr-only"
              checked={active}
              onChange={() => onToggle(item.id)}
            />
            <span className="text-sm text-gray-700">
              {item.name}
              {item.balance_count != null && (
                <span className="text-gray-400 ml-1">({item.balance_count})</span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export default function BalanceChartDefaultItems() {
  const [allItems, setAllItems] = useState([]);
  const [filterItems, setFilterItems] = useState(null);
  const [defaultItems, setDefaultItems] = useState(null);
  const [labelOverrides, setLabelOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([getBalanceAllItems(), getSettings()])
      .then(([itemsRes, settingsRes]) => {
        const items = itemsRes.data?.data || [];
        const settings = settingsRes.data?.data || {};
        setAllItems(items);

        // Load filter items setting
        const savedFilter = settings.balance_chart_filter_items;
        if (savedFilter) {
          try {
            setFilterItems(JSON.parse(savedFilter));
          } catch {
            setFilterItems(items.map((i) => i.id));
          }
        } else {
          // Default: all items
          setFilterItems(items.map((i) => i.id));
        }

        // Load default items setting
        const savedDefaults = settings.balance_chart_default_items;
        if (savedDefaults) {
          try {
            setDefaultItems(JSON.parse(savedDefaults));
          } catch {
            setDefaultItems(items.map((i) => i.id));
          }
        } else {
          setDefaultItems(items.map((i) => i.id));
        }

        // Load label overrides setting
        const savedOverrides = settings.balance_chart_label_overrides;
        if (savedOverrides) {
          try {
            setLabelOverrides(JSON.parse(savedOverrides));
          } catch {
            setLabelOverrides({});
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleFilterItem = (id) => {
    setFilterItems((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // Remove from defaults if no longer in filter
      setDefaultItems((prevDefaults) => prevDefaults.filter((x) => next.includes(x)));
      return next;
    });
    setSaved(false);
  };

  const toggleDefaultItem = (id) => {
    setDefaultItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Strip empty overrides before saving
      const cleanOverrides = Object.fromEntries(
        Object.entries(labelOverrides).filter(([, v]) => v.trim() !== '')
      );
      await updateSettings({
        balance_chart_filter_items: JSON.stringify(filterItems),
        balance_chart_default_items: JSON.stringify(defaultItems),
        balance_chart_label_overrides: JSON.stringify(cleanOverrides),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card mt-6"><Loader /></div>;
  if (allItems.length === 0) return null;

  // Items available for the defaults step (only those in filter selection)
  const filterableItems = allItems.filter((i) => filterItems?.includes(i.id));

  // Build a color index map based on position in allItems (for consistent colors)
  const colorIndexMap = Object.fromEntries(allItems.map((item, idx) => [item.id, idx]));

  const allFilterSelected = filterItems?.length === allItems.length;
  const allDefaultSelected = defaultItems?.length === filterableItems.length;

  return (
    <div className="card mt-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1">Configuración del gráfico de evolución</h2>
        <p className="text-sm text-gray-500">
          Configurá qué ítems estarán disponibles como filtros y cuáles aparecerán activos por defecto.
        </p>
      </div>

      {/* Step 1: Filter items */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">
          Paso 1 — Ítems disponibles como filtros
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Elegí qué ítems aparecerán como opciones en el selector del gráfico. Podés elegir de todos los ítems, sin importar si son totales.
        </p>
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => {
              setFilterItems(allItems.map((i) => i.id));
              setSaved(false);
            }}
            disabled={allFilterSelected}
            className="text-sm text-azul hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Seleccionar todos
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => {
              setFilterItems([]);
              setDefaultItems([]);
              setSaved(false);
            }}
            disabled={filterItems?.length === 0}
            className="text-sm text-gray-500 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Deseleccionar todos
          </button>
        </div>
        <ItemCheckboxList
          items={allItems}
          selected={filterItems ?? []}
          onToggle={toggleFilterItem}
          colorIndexMap={colorIndexMap}
        />
      </div>

      {/* Step 2: Default active items */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">
          Paso 2 — Ítems activos por defecto
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          De los ítems seleccionados como filtros, elegí cuáles estarán marcados por defecto al cargar el gráfico.
        </p>

        {filterableItems.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            Seleccioná al menos un ítem en el paso anterior para configurar los activos por defecto.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => {
                  setDefaultItems(filterableItems.map((i) => i.id));
                  setSaved(false);
                }}
                disabled={allDefaultSelected}
                className="text-sm text-azul hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Seleccionar todos
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => {
                  setDefaultItems([]);
                  setSaved(false);
                }}
                disabled={defaultItems?.length === 0}
                className="text-sm text-gray-500 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Deseleccionar todos
              </button>
            </div>
            <ItemCheckboxList
              items={filterableItems}
              selected={defaultItems ?? []}
              onToggle={toggleDefaultItem}
              colorIndexMap={colorIndexMap}
            />
          </>
        )}
      </div>

      {/* Step 3: Label overrides */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">
          Paso 3 — Etiquetas cortas (opcional)
        </h3>
        <p className="text-sm text-gray-500 mb-3">
          Definí un nombre abreviado para cada ítem. Se usará en el gráfico en lugar del nombre original cuando el texto sea muy largo. Dejá en blanco para usar el nombre original.
        </p>
        {filterableItems.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            Seleccioná al menos un ítem en el paso 1 para configurar sus etiquetas.
          </p>
        ) : (
          <div className="space-y-2">
            {filterableItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="text-sm text-gray-500 w-1/2 truncate" title={item.name}>
                  {item.name}
                </span>
                <input
                  type="text"
                  value={labelOverrides[item.id] ?? ''}
                  onChange={(e) => {
                    setLabelOverrides((prev) => ({ ...prev, [item.id]: e.target.value }));
                    setSaved(false);
                  }}
                  placeholder="Etiqueta corta…"
                  className="input text-sm flex-1"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-primary text-sm"
      >
        {saving ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar configuración'}
      </button>
    </div>
  );
}
