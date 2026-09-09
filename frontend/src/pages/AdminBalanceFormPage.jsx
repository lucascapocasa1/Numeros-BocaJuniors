import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  getBalance,
  createBalance,
  updateBalance,
  analyzeBalance,
  applyBalanceAnalysis,
  getBalanceDownloadUrl,
  getSettings,
  createLine,
  reorderLines,
  updateLine,
  deleteLine,
} from '../api/endpoints';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';

const CURRENCIES = ['ARS', 'USD', 'EUR'];

const formatMoney = (amount, currency = 'ARS') =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

// ── Tree preview (AI result before applying) ──────────────────────────────────

function PreviewNode({ node, level = 0 }) {
  const [open, setOpen] = useState(level < 2);
  const hasChildren = node.children?.length > 0;

  return (
    <div style={{ paddingLeft: `${level * 14}px` }}>
      <div
        className={`flex items-center justify-between py-0.5 ${node.is_total ? 'font-semibold text-gray-800' : 'text-gray-700'}`}
      >
        <button
          type="button"
          onClick={() => hasChildren && setOpen((o) => !o)}
          className={`flex items-center gap-1 text-left text-xs ${hasChildren ? 'cursor-pointer' : 'cursor-default'}`}
        >
          {hasChildren && (
            <span className="text-gray-400 w-3">{open ? '▾' : '▸'}</span>
          )}
          {!hasChildren && <span className="w-3" />}
          <span>{node.name}</span>
          {node.is_total && (
            <span className="ml-1 text-[10px] text-purple-600 font-normal">(total)</span>
          )}
        </button>
        {node.amount != null && (
          <span className={`text-xs font-mono ml-4 ${node.amount < 0 ? 'text-red-600' : ''}`}>
            {Number(node.amount).toLocaleString('es-AR')}
          </span>
        )}
      </div>
      {open && hasChildren && node.children.map((child, i) => (
        <PreviewNode key={i} node={child} level={level + 1} />
      ))}
    </div>
  );
}

// ── Editable lines tree ───────────────────────────────────────────────────────

function flattenTree(nodes, depth = 0) {
  const result = [];
  for (const n of nodes) {
    result.push({ id: n.id, name: n.name, depth });
    if (n.children?.length) result.push(...flattenTree(n.children, depth + 1));
  }
  return result;
}

function getDescendantIds(node) {
  const ids = [];
  for (const child of node.children || []) {
    ids.push(child.id);
    ids.push(...getDescendantIds(child));
  }
  return ids;
}

// Finds the node in the tree by id, swaps its order with the adjacent sibling,
// and returns { nodes: updatedTree, swapped: [{id, order}, {id, order}] | null }.
function findAndSwap(nodes, nodeId, direction) {
  const idx = nodes.findIndex((n) => n.id === nodeId);
  if (idx !== -1) {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= nodes.length) return { nodes, swapped: null };
    const arr = [...nodes];
    const aOrder = arr[idx].order;
    const bOrder = arr[targetIdx].order;
    arr[idx]       = { ...arr[idx],       order: bOrder };
    arr[targetIdx] = { ...arr[targetIdx], order: aOrder };
    const sorted = [...arr].sort((a, b) => a.order - b.order);
    return {
      nodes: sorted,
      swapped: [
        { id: arr[idx].id,       order: bOrder },
        { id: arr[targetIdx].id, order: aOrder },
      ],
    };
  }
  let swapped = null;
  const newNodes = nodes.map((n) => {
    if (swapped) return n;
    const result = findAndSwap(n.children || [], nodeId, direction);
    if (result.swapped) {
      swapped = result.swapped;
      return { ...n, children: result.nodes };
    }
    return n;
  });
  return { nodes: newNodes, swapped };
}

function LineNode({ node, balanceId, level = 0, isFirst, isLast, flatLines, onDelete, onLineAdded, onLineUpdated, onMoveUp, onMoveDown, onReparent }) {
  const [addingChild, setAddingChild]   = useState(false);
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountInput, setAmountInput]   = useState(node.amount ?? '');
  const [open, setOpen] = useState(level < 2);
  const [reparenting, setReparenting]   = useState(false);
  const [newParentId, setNewParentId]   = useState('');
  const hasChildren = node.children?.length > 0;

  const descendantIds = new Set(getDescendantIds(node));
  const availableParents = (flatLines || []).filter(p => p.id !== node.id && !descendantIds.has(p.id));

  const handleReparentSave = async () => {
    const parentId = newParentId === '' ? null : parseInt(newParentId, 10);
    try {
      await onReparent(node.id, parentId);
    } finally {
      setReparenting(false);
    }
  };

  const handleAddChild = () => { setAddingChild(true); setOpen(true); };

  const handleAmountSave = async () => {
    try {
      const res = await updateLine(balanceId, node.id, { amount: amountInput === '' ? null : parseFloat(amountInput) });
      onLineUpdated(res.data.data);
      setEditingAmount(false);
    } catch {
      setEditingAmount(false);
    }
  };

  return (
    <div style={{ paddingLeft: level > 0 ? `${level * 14}px` : undefined }}>
      <div
        className={`flex items-center justify-between gap-2 py-1 border-b border-gray-50 group ${node.is_total ? 'font-semibold' : ''}`}
      >
        <button
          type="button"
          onClick={() => (hasChildren || node.children?.length > 0) && setOpen((o) => !o)}
          className="flex items-center gap-1 text-xs text-left flex-1 min-w-0"
        >
          {(hasChildren || addingChild) && (
            <span className="text-gray-400 w-3 flex-shrink-0">{open ? '▾' : '▸'}</span>
          )}
          {!hasChildren && !addingChild && <span className="w-3 flex-shrink-0" />}
          <span className="truncate">{node.name}</span>
          {node.is_total && <span className="ml-1 text-[10px] text-gray-400 font-normal flex-shrink-0">(total)</span>}
        </button>

        <div className="flex items-center gap-2 flex-shrink-0">
          {reparenting ? (
            <div className="flex items-center gap-1">
              <select
                value={newParentId}
                onChange={(e) => setNewParentId(e.target.value)}
                className="input-field text-xs py-0.5 px-1 max-w-52"
                autoFocus
              >
                <option value="">— raíz —</option>
                {availableParents.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {'· '.repeat(p.depth)}{p.name}
                  </option>
                ))}
              </select>
              <button onClick={handleReparentSave} className="text-xs text-green-600 hover:underline">✓</button>
              <button onClick={() => setReparenting(false)} className="text-xs text-gray-400 hover:underline">✕</button>
            </div>
          ) : (
            <>
              {editingAmount ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="input-field text-xs w-28 py-0.5 px-1"
                    step="0.01"
                    autoFocus
                  />
                  <button onClick={handleAmountSave} className="text-xs text-green-600 hover:underline">✓</button>
                  <button onClick={() => setEditingAmount(false)} className="text-xs text-gray-400 hover:underline">✕</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => { setAmountInput(node.amount ?? ''); setEditingAmount(true); }}
                  className="text-xs font-mono text-gray-600 hover:text-blue-600"
                >
                  {node.amount != null ? (
                    <span className={node.amount < 0 ? 'text-red-600' : ''}>
                      {formatMoney(node.amount, node.currency)}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-[10px]">— monto</span>
                  )}
                </button>
              )}

              <div className="hidden group-hover:flex items-center gap-1">
                {!isFirst && (
                  <button
                    type="button"
                    onClick={() => onMoveUp(node.id)}
                    title="Subir"
                    className="text-[10px] text-gray-400 hover:text-gray-700 px-0.5"
                  >
                    ▲
                  </button>
                )}
                {!isLast && (
                  <button
                    type="button"
                    onClick={() => onMoveDown(node.id)}
                    title="Bajar"
                    className="text-[10px] text-gray-400 hover:text-gray-700 px-0.5"
                  >
                    ▼
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setNewParentId(node.parent_id != null ? String(node.parent_id) : ''); setReparenting(true); }}
                  title="Cambiar nivel / parent"
                  className="text-[10px] text-purple-500 hover:underline px-1"
                >
                  ↕ mover
                </button>
                <button
                  type="button"
                  onClick={handleAddChild}
                  title="Agregar sub-línea"
                  className="text-[10px] text-blue-500 hover:underline px-1"
                >
                  + hijo
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(node.id)}
                  title="Eliminar línea y sus hijos"
                  className="text-[10px] text-red-400 hover:underline px-1"
                >
                  ✕
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {open && (
        <>
          {node.children?.map((child, i) => (
            <LineNode
              key={child.id}
              node={child}
              balanceId={balanceId}
              level={level + 1}
              isFirst={i === 0}
              isLast={i === node.children.length - 1}
              flatLines={flatLines}
              onDelete={onDelete}
              onLineAdded={onLineAdded}
              onLineUpdated={onLineUpdated}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onReparent={onReparent}
            />
          ))}
          {addingChild && (
            <AddLineForm
              balanceId={balanceId}
              parentId={node.id}
              parentCurrency={node.currency}
              onAdded={(line) => { onLineAdded(line); setAddingChild(false); setOpen(true); }}
              onCancel={() => setAddingChild(false)}
              indent={level + 1}
            />
          )}
        </>
      )}
    </div>
  );
}

function AddLineForm({ balanceId, parentId = null, parentCurrency = 'ARS', onAdded, onCancel, indent = 0 }) {
  const [name, setName]       = useState('');
  const [amount, setAmount]   = useState('');
  const [currency, setCurrency] = useState(parentCurrency);
  const [isTotal, setIsTotal] = useState(false);
  const [saving, setSaving]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await createLine(balanceId, {
        parent_id: parentId,
        name:      name.trim(),
        amount:    amount !== '' ? parseFloat(amount) : null,
        currency,
        is_total:  isTotal,
      });
      onAdded(res.data.data);
      setName('');
      setAmount('');
    } catch {
      // noop
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ paddingLeft: `${indent * 14}px` }} className="py-1">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la línea"
          className="input-field text-xs py-1 px-2 flex-1 min-w-32"
          required
          autoFocus
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Monto (opcional)"
          className="input-field text-xs py-1 px-2 w-32"
          step="0.01"
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="input-field text-xs py-1 px-2 w-20"
        >
          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={isTotal}
            onChange={(e) => setIsTotal(e.target.checked)}
            className="rounded"
          />
          total
        </label>
        <button type="submit" disabled={saving} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {saving ? '...' : '+ Agregar'}
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-gray-400 hover:underline">
          Cancelar
        </button>
      </form>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminBalanceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  // Balance form state
  const [exercise, setExercise]       = useState('');
  const [dollarReference, setDollarReference] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [file, setFile]               = useState(null);
  const [existingFile, setExistingFile] = useState(null);

  // Lines tree
  const [lines, setLines] = useState([]);
  const [addingRoot, setAddingRoot] = useState(false);

  // AI Analysis
  const [analyzing, setAnalyzing]       = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError]   = useState('');
  const [hasOpenAiKey, setHasOpenAiKey] = useState(false);
  const [applying, setApplying]         = useState(false);
  const [applyError, setApplyError]     = useState('');

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    getSettings()
      .then((res) => setHasOpenAiKey(!!res.data?.data?.openai_api_key))
      .catch(() => setHasOpenAiKey(false));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getBalance(id)
      .then((res) => {
        const d = res.data?.data || {};
        setExercise(d.exercise || '');
        setDollarReference(d.dollar_reference ?? '');
        setPublishedAt(d.published_at || '');
        setExistingFile(d.has_file ? d.file_original_name : null);
        setLines(d.lines || []);
      })
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!exercise.trim()) { setError('El ejercicio es obligatorio'); return; }
    setSaving(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('exercise', exercise.trim());
    if (dollarReference) formData.append('dollar_reference', dollarReference);
    if (publishedAt)     formData.append('published_at', publishedAt);
    if (file)            formData.append('file', file);

    try {
      if (isEdit) {
        await updateBalance(id, formData);
        setSuccess('Balance actualizado correctamente');
      } else {
        const res = await createBalance(formData);
        const newId = res.data?.data?.id;
        setSuccess('Balance creado correctamente');
        setTimeout(() => navigate(`/admin/balances/${newId}/editar`), 800);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar el balance');
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!existingFile && !file) {
      setAnalysisError('Primero guarda el balance con un archivo para poder analizar.');
      return;
    }
    setAnalyzing(true);
    setAnalysisError('');
    setAnalysisResult(null);
    setApplyError('');
    try {
      const res = await analyzeBalance(id);
      setAnalysisResult(res.data?.data || {});
    } catch (err) {
      setAnalysisError(err.response?.data?.error || 'Error al analizar el balance con IA');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApplyAnalysis = async () => {
    if (!analysisResult?.data?.length) return;
    setApplying(true);
    setApplyError('');
    try {
      const res = await applyBalanceAnalysis(id, { data: analysisResult.data });
      setLines(res.data?.data?.lines || []);
      setAnalysisResult(null);
    } catch (err) {
      setApplyError(err.response?.data?.error || 'Error al aplicar el desglose');
    } finally {
      setApplying(false);
    }
  };

  // Rebuild the tree from a flat updated line (for amount edits)
  const updateLineInTree = (updated) => {
    const patch = (nodes) => nodes.map((n) => {
      if (n.id === updated.id) return { ...n, amount: updated.amount };
      return { ...n, children: patch(n.children || []) };
    });
    setLines((prev) => patch(prev));
  };

  // Remove a node (and its children) from the local tree
  const removeLineFromTree = (lineId) => {
    const remove = (nodes) => nodes
      .filter((n) => n.id !== lineId)
      .map((n) => ({ ...n, children: remove(n.children || []) }));
    setLines((prev) => remove(prev));
  };

  const handleDeleteLine = async (lineId) => {
    if (!window.confirm('¿Eliminar esta línea y todas sus sub-líneas?')) return;
    await deleteLine(id, lineId);
    removeLineFromTree(lineId);
  };

  const handleMoveUp = async (nodeId) => {
    const { nodes, swapped } = findAndSwap(lines, nodeId, 'up');
    if (!swapped) return;
    setLines(nodes);
    await reorderLines(id, swapped);
  };

  const handleMoveDown = async (nodeId) => {
    const { nodes, swapped } = findAndSwap(lines, nodeId, 'down');
    if (!swapped) return;
    setLines(nodes);
    await reorderLines(id, swapped);
  };

  const handleReparent = async (nodeId, newParentId) => {
    await updateLine(id, nodeId, { parent_id: newParentId });
    getBalance(id).then((res) => setLines(res.data?.data?.lines || []));
  };

  // Add a root-level line to local tree
  const handleRootLineAdded = (line) => {
    setLines((prev) => [...prev, { ...line, children: [] }]);
  };

  // Add a child line into the tree (we reload the whole tree for simplicity)
  const handleChildLineAdded = () => {
    getBalance(id).then((res) => setLines(res.data?.data?.lines || []));
  };

  if (loading) return <Loader />;

  const aiData  = analysisResult?.data  || [];
  const aiNotes = analysisResult?.notes || '';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/admin/balances" className="text-azul text-sm hover:underline">&larr; Balances</Link>
        <h1 className="text-2xl font-extrabold">{isEdit ? 'Editar balance' : 'Nuevo balance'}</h1>
      </div>

      {/* Metadata form */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4">Datos del balance</h2>
        <form onSubmit={handleSave} className="space-y-4">
          {error   && <ErrorMessage message={error} />}
          {success && <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">{success}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Ejercicio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
                className="input-field w-full"
                placeholder="2024/2025"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha de publicación</label>
              <input
                type="date"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className="input-field w-full"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Valor de referencia del dólar (ARS)</label>
              <input
                type="number"
                value={dollarReference}
                onChange={(e) => setDollarReference(e.target.value)}
                className="input-field w-full"
                placeholder="1250"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Archivo del balance</label>
            {existingFile && (
              <div className="flex items-center gap-2 mb-2 text-sm text-green-700">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Archivo actual: <strong>{existingFile}</strong>
              </div>
            )}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => setFile(e.target.files[0] || null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-azul file:text-white hover:file:bg-red-800 cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-1">PDF, Word o Excel. Máximo 20 MB.</p>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Guardando...' : isEdit ? 'Actualizar balance' : 'Crear balance'}
          </button>
        </form>
      </div>

      {/* Edit-mode sections */}
      {isEdit && (
        <>
          {/* AI Analysis */}
          <div className="card mb-6 border border-purple-100 bg-purple-50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-purple-900">Análisis con IA</h2>
                <p className="text-sm text-purple-700 mt-1">
                  La IA extrae el desglose jerárquico completo del ejercicio principal.
                  Revisá el resultado antes de aplicarlo.
                </p>
                {!hasOpenAiKey && (
                  <p className="text-sm text-amber-700 mt-2 font-medium">
                    API Key de OpenAI no configurada.{' '}
                    <Link to="/admin/configuracion" className="underline">Configurala en Ajustes</Link>{' '}
                    para habilitar esta función.
                  </p>
                )}
              </div>
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !hasOpenAiKey}
                title={!hasOpenAiKey ? 'Configurá la API Key de OpenAI en Ajustes' : undefined}
                className="flex-shrink-0 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? 'Analizando...' : 'Analizar balance'}
              </button>
            </div>

            {analyzing && (
              <div className="mt-3 p-3 bg-purple-100 text-purple-800 rounded-lg text-sm flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Procesando documento... esto puede tomar hasta 2 minutos.
              </div>
            )}

            {analysisError && (
              <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{analysisError}</div>
            )}

            {analysisResult && aiData.length > 0 && (
              <div className="mt-4 bg-white rounded-lg border border-purple-100 overflow-hidden">
                <div className="px-4 py-2 bg-purple-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-purple-900">
                      Resultado del análisis
                    </span>
                    {analysisResult.estado && (
                      <span className="text-xs text-purple-600">{analysisResult.estado}</span>
                    )}
                    {analysisResult.fecha && (
                      <span className="text-xs text-purple-600">{analysisResult.fecha}</span>
                    )}
                    {analysisResult.moneda && (
                      <span className="text-xs text-purple-600">{analysisResult.moneda}</span>
                    )}
                  </div>
                  <button
                    onClick={handleApplyAnalysis}
                    disabled={applying}
                    className="text-xs px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-semibold disabled:opacity-50"
                  >
                    {applying ? 'Aplicando...' : 'Aplicar desglose'}
                  </button>
                </div>
                <div className="p-4">
                  {aiNotes && <p className="text-xs text-gray-500 italic mb-3">{aiNotes}</p>}
                  {applyError && (
                    <p className="text-xs text-red-600 mb-3">{applyError}</p>
                  )}
                  <div className="max-h-80 overflow-y-auto text-sm">
                    {aiData.map((node, i) => <PreviewNode key={i} node={node} level={0} />)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Lines tree */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Desglose del balance</h2>
              <div className="flex items-center gap-3">
                {existingFile && (
                  <a
                    href={getBalanceDownloadUrl(id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-azul hover:underline"
                  >
                    Descargar archivo →
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setAddingRoot(true)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  + Agregar línea
                </button>
              </div>
            </div>

            {lines.length === 0 && !addingRoot ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No hay desglose cargado aún. Usá el análisis IA o agregá líneas manualmente.
              </p>
            ) : (
              <div className="text-sm">
                {lines.map((line, i) => (
                  <LineNode
                    key={line.id}
                    node={line}
                    balanceId={id}
                    level={0}
                    isFirst={i === 0}
                    isLast={i === lines.length - 1}
                    flatLines={flattenTree(lines)}
                    onDelete={handleDeleteLine}
                    onLineAdded={handleChildLineAdded}
                    onLineUpdated={updateLineInTree}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    onReparent={handleReparent}
                  />
                ))}
                {addingRoot && (
                  <AddLineForm
                    balanceId={id}
                    parentId={null}
                    onAdded={(line) => { handleRootLineAdded(line); setAddingRoot(false); }}
                    onCancel={() => setAddingRoot(false)}
                    indent={0}
                  />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
