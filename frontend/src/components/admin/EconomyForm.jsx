import { useState } from 'react';

const emptyForm = {
  description: '',
  comments: '',
  entity: '',
  type: 'cobro',
  amount: '',
  currency: 'ARS',
  record_date: '',
  carried_out_date: '',
  links: [],
};

const normalizeLink = (l) =>
  typeof l === 'string' ? { url: l, official: false } : { ...l, official: !!l.official };

export default function EconomyForm({ initial, onSubmit, loading }) {
  const normalizeDate = (date) => {
    if (!date) return '';
    if (date instanceof Date) return date.toISOString().split('T')[0];
    if (typeof date === 'string') return date.split('T')[0];
    return '';
  };

  const [form, setForm] = useState({
    ...emptyForm,
    ...initial,
    record_date: normalizeDate(initial?.record_date),
    carried_out_date: normalizeDate(initial?.carried_out_date),
    amount: initial?.amount ?? '',
    links: Array.isArray(initial?.links) ? initial.links.map(normalizeLink) : [],
  });
  const [linkInput, setLinkInput] = useState('');

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const addLink = () => {
    if (linkInput.trim()) {
      set('links', [...(form.links || []), { url: linkInput.trim(), official: false }]);
      setLinkInput('');
    }
  };

  const toggleLinkOfficial = (i) => {
    set('links', form.links.map((l, idx) => idx === i ? { ...l, official: !l.official } : l));
  };

  const removeLink = (i) => {
    set('links', form.links.filter((_, idx) => idx !== i));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      amount: parseFloat(form.amount),
      record_date: form.record_date || null,
      carried_out_date: form.carried_out_date || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Descripcion *</label>
          <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          className="input-field"
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Entidad</label>
          <input
            type="text"
            value={form.entity}
            onChange={(e) => set('entity', e.target.value)}
            className="input-field"
            placeholder="Club, jugador,..."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Comentarios</label>
          <input
            type="text"
            value={form.comments}
            onChange={(e) => set('comments', e.target.value)}
            className="input-field"
            placeholder="Info adicional"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tipo *</label>
          <select value={form.type} onChange={(e) => set('type', e.target.value)} className="input-field">
            <option value="cobro">Cobro</option>
            <option value="pago">Pago</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Moneda *</label>
          <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className="input-field">
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Monto *</label>
          <input
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
          <input
            type="date"
            value={form.record_date}
            onChange={(e) => set('record_date', e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de confirmación</label>
        <input
          type="date"
          value={form.carried_out_date}
          onChange={(e) => set('carried_out_date', e.target.value)}
          className="input-field"
        />
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
            {form.links?.map((l, i) => (
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
