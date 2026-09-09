import { useState, useEffect, useRef } from 'react';

const emptyForm = {
  external_id: '',
  full_name: '',
  expiration_date: '',
  signing_date: '',
  termination_date: '',
  club_pass_percentage: '',
  estimated_salary: '',
  currency: 'USD',
  clauses: [],
  links: [],
  loan: null,
  loan_date: '',
  loan_return_date: '',
};

const normalizeLink = (l) =>
  typeof l === 'string' ? { url: l, official: false } : { ...l, official: !!l.official };

export default function ContractForm({ initial, onSubmit, onSubmitAsChange, loading }) {
  const [form, setForm] = useState(emptyForm);
  const pendingAction = useRef('save');
  const [clausulaInput, setClausulaInput] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [loanClausulaInput, setLoanClausulaInput] = useState('');

  useEffect(() => {
    if (initial) {
      const formatDate = (d) => (d ? d.split('T')[0] : '');
      setForm({
        external_id: initial.external_id || '',
        full_name: initial.full_name || '',
        expiration_date: formatDate(initial.expiration_date),
        signing_date: formatDate(initial.signing_date),
        termination_date: formatDate(initial.termination_date),
        club_pass_percentage: initial.club_pass_percentage?.toString() || '',
        estimated_salary: initial.estimated_salary?.toString() || '',
        currency: initial.currency || 'USD',
        clauses: initial.clauses || [],
        links: (initial.links || []).map(normalizeLink),
        loan: initial.loan
          ? { ...initial.loan, clauses: initial.loan.clauses || [] }
          : null,
        loan_date: formatDate(initial.loan_date),
        loan_return_date: formatDate(initial.loan_return_date),
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

  const toggleLoan = () => {
    set('loan', form.loan ? null : { club: '', until: '', clauses: [] });
  };

  const setLoan = (key, value) => {
    set('loan', { ...form.loan, [key]: value });
  };

  const addLoanClausula = () => {
    if (loanClausulaInput.trim()) {
      setLoan('clauses', [...(form.loan.clauses || []), loanClausulaInput.trim()]);
      setLoanClausulaInput('');
    }
  };

  const removeLoanClausula = (i) => {
    setLoan('clauses', (form.loan.clauses || []).filter((_, idx) => idx !== i));
  };

  const buildFormData = () => {
    const hasLoan = !!form.loan?.club;
    return {
      ...form,
      club_pass_percentage: parseFloat(form.club_pass_percentage),
      estimated_salary: form.estimated_salary ? parseFloat(form.estimated_salary) : null,
      currency: form.estimated_salary ? form.currency : null,
      signing_date: form.signing_date || null,
      termination_date: form.termination_date || null,
      loan: hasLoan ? form.loan : null,
      loan_date: hasLoan ? (form.loan_date || null) : null,
      loan_return_date: !hasLoan ? (form.loan_return_date || null) : null,
    };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = buildFormData();
    if (pendingAction.current === 'saveAsChange' && onSubmitAsChange) {
      onSubmitAsChange(data);
    } else {
      onSubmit(data);
    }
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de firma</label>
          <input
            type="date"
            value={form.signing_date}
            onChange={(e) => set('signing_date', e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Fecha vencimiento *</label>
          <input
            type="date"
            value={form.expiration_date}
            onChange={(e) => set('expiration_date', e.target.value)}
            className="input-field"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de rescisión</label>
        <input
          type="date"
          value={form.termination_date}
          onChange={(e) => set('termination_date', e.target.value)}
          className="input-field"
        />
        <p className="text-xs text-gray-400 mt-1">Solo si el contrato fue rescindido antes de su vencimiento.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">% Pase club *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={form.club_pass_percentage}
            onChange={(e) => set('club_pass_percentage', e.target.value)}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Salario estimado</label>
          <input
            type="number"
            step="0.01"
            value={form.estimated_salary}
            onChange={(e) => set('estimated_salary', e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Moneda</label>
          <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className="input-field">
            <option value="USD">USD</option>
            <option value="ARS">ARS</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Clausulas</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={clausulaInput}
            onChange={(e) => setClausulaInput(e.target.value)}
            className="input-field flex-1"
            placeholder="Ej: Clausula de rescision USD 5M"
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

      <div className="border border-gray-200 rounded-lg p-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.loan}
            onChange={toggleLoan}
            className="rounded border-gray-300 text-azul focus:ring-azul"
          />
          <span className="text-sm font-medium text-gray-700">Jugador a préstamo</span>
        </label>

        {!form.loan && initial?.loan && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de regreso al plantel</label>
            <input
              type="date"
              value={form.loan_return_date}
              onChange={(e) => set('loan_return_date', e.target.value)}
              className="input-field"
            />
          </div>
        )}

        {form.loan && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Club *</label>
                <input
                  type="text"
                  value={form.loan.club}
                  onChange={(e) => setLoan('club', e.target.value)}
                  className="input-field"
                  placeholder="Nombre del club"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de inicio</label>
                <input
                  type="date"
                  value={form.loan_date}
                  onChange={(e) => set('loan_date', e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
                <input
                  type="date"
                  value={form.loan.until || ''}
                  onChange={(e) => setLoan('until', e.target.value || null)}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cláusulas del préstamo</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={loanClausulaInput}
                  onChange={(e) => setLoanClausulaInput(e.target.value)}
                  className="input-field flex-1"
                  placeholder="Ej: Opción de compra USD 3M"
                />
                <button type="button" onClick={addLoanClausula} className="btn-secondary text-sm">
                  Agregar
                </button>
              </div>
              {form.loan.clauses?.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {form.loan.clauses.map((c, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm bg-blue-50 rounded px-2 py-1">
                      <span className="flex-1">{c}</span>
                      <button type="button" onClick={() => removeLoanClausula(i)} className="text-red-500 text-xs">
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          onClick={() => { pendingAction.current = 'save'; }}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </button>

        {onSubmitAsChange && (
          <button
            type="submit"
            onClick={() => { pendingAction.current = 'saveAsChange'; }}
            disabled={loading}
            className="btn-secondary w-full"
          >
            Guardar como cambio de condiciones
          </button>
        )}
      </div>
    </form>
  );
}
