import { useState, useEffect } from 'react';

const emptyForm = {
  external_id: '',
  full_name: '',
  clauses: [],
  links: [],
};

const normalizeLink = (l) =>
  typeof l === 'string' ? { url: l, official: false } : { ...l, official: !!l.official };

export default function RightForm({ initial, onSubmit, loading }) {
  const [form, setForm] = useState(emptyForm);
  const [clausulaInput, setClausulaInput] = useState('');
  const [linkInput, setLinkInput] = useState('');

  useEffect(() => {
    if (initial) {
      setForm({
        external_id: initial.external_id || '',
        full_name: initial.full_name || '',
        clauses: initial.clauses || [],
        links: (initial.links || []).map(normalizeLink),
      });
    }
  }, [initial]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const addClausula = () => {
    if (clausulaInput.trim()) {
      set('clauses', [...(form.clauses || []), clausulaInput.trim()]);
      setClausulaInput('');
    }
  };

  const removeClausula = (i) => {
    set('clauses', form.clauses.filter((_, idx) => idx !== i));
  };

  const addLink = () => {
    if (linkInput.trim()) {
      set('links', [...(form.links || []), { url: linkInput.trim(), official: false }]);
      setLinkInput('');
    }
  };

  const removeLink = (i) => {
    set('links', form.links.filter((_, idx) => idx !== i));
  };

  const toggleLinkOfficial = (i) => {
    set('links', form.links.map((l, idx) => idx === i ? { ...l, official: !l.official } : l));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      clauses: form.clauses.length > 0 ? form.clauses : null,
      links: form.links.length > 0 ? form.links : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">ID Externo</label>
        <input
          type="text"
          value={form.external_id}
          onChange={(e) => set('external_id', e.target.value)}
          className="input-field"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Nombre completo *</label>
        <input
          type="text"
          value={form.full_name}
          onChange={(e) => set('full_name', e.target.value)}
          className="input-field"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Clausulas</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={clausulaInput}
            onChange={(e) => setClausulaInput(e.target.value)}
            className="input-field flex-1"
            placeholder="Ej: Porcentaje de futura venta 20%"
          />
          <button type="button" onClick={addClausula} className="btn-secondary text-sm">
            Agregar
          </button>
        </div>
        {form.clauses?.length > 0 && (
          <ul className="mt-2 space-y-1">
            {form.clauses.map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-2 py-1">
                <span className="flex-1">{c}</span>
                <button type="button" onClick={() => removeClausula(i)} className="text-red-500 text-xs">
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Links / Fuentes</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            className="input-field flex-1"
            placeholder="https://..."
          />
          <button type="button" onClick={addLink} className="btn-secondary text-sm">
            Agregar
          </button>
        </div>
        {form.links?.length > 0 && (
          <ul className="mt-2 space-y-1">
            {form.links.map((l, i) => (
              <li key={i} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-2 py-1">
                <span className="truncate flex-1 text-gray-600">{l.url}</span>
                <label className="flex items-center gap-1 text-xs text-gray-500 shrink-0">
                  <input
                    type="checkbox"
                    checked={l.official}
                    onChange={() => toggleLinkOfficial(i)}
                    className="rounded border-gray-300 text-azul focus:ring-azul"
                  />
                  Oficial
                </label>
                <button type="button" onClick={() => removeLink(i)} className="text-red-500 text-xs shrink-0">
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  );
}
