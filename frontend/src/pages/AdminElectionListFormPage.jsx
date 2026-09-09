import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getAdminElections,
  createElectionList,
  updateElectionList,
  createElectionCandidate,
  updateElectionCandidate,
  deleteElectionCandidate,
  createElectionProposal,
  updateElectionProposal,
  deleteElectionProposal,
  createElectionCommitment,
  updateElectionCommitment,
  deleteElectionCommitment,
  getElectionListLogoUrl,
  getElectionCandidatePhotoUrl,
  getElectionCandidateCvUrl,
} from '../api/endpoints';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';

const emptyCandidateForm = { first_name: '', last_name: '', position: '', order: '0' };
const emptyProposalForm = { title: '', description: '', no_commitments_reason: '', order: '0' };
const emptyCommitmentForm = { kind: 'compromiso', description: '', metric_value: '', metric_unit: '', deadline: '' };

const fileInputClass =
  'block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-azul file:text-white hover:file:bg-red-800 cursor-pointer';

export default function AdminElectionListFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [list, setList] = useState(null);

  // List basic form
  const [listName, setListName] = useState('');
  const [listSourceUrl, setListSourceUrl] = useState('');
  const [listLogoFile, setListLogoFile] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [listSuccess, setListSuccess] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [publicLinkCopied, setPublicLinkCopied] = useState(false);

  // Candidate form
  const [candForm, setCandForm] = useState(emptyCandidateForm);
  const [candPhotoFile, setCandPhotoFile] = useState(null);
  const [candCvFile, setCandCvFile] = useState(null);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [candLoading, setCandLoading] = useState(false);
  const [candError, setCandError] = useState('');

  // Proposal form
  const [propForm, setPropForm] = useState(emptyProposalForm);
  const [editingProposal, setEditingProposal] = useState(null);
  const [propLoading, setPropLoading] = useState(false);
  const [propError, setPropError] = useState('');

  // Commitment form (nested under the proposal being edited)
  const [commitForm, setCommitForm] = useState(emptyCommitmentForm);
  const [editingCommitment, setEditingCommitment] = useState(null);
  const [commitLoading, setCommitLoading] = useState(false);
  const [commitError, setCommitError] = useState('');

  const fetchData = useCallback(() => {
    if (!isEdit) return;
    setLoading(true);
    getAdminElections()
      .then((res) => {
        const found = (res.data.data || []).find((l) => String(l.id) === String(id));
        setList(found || null);
        if (found) {
          setListName(found.name || '');
          setListSourceUrl(found.source_url || '');
        }
      })
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Keep the proposal being edited (and its commitments) in sync after refetches
  useEffect(() => {
    if (!editingProposal || !list) return;
    const fresh = (list.proposals || []).find((p) => p.id === editingProposal.id);
    if (fresh) setEditingProposal(fresh);
  }, [list]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleListSubmit = async (e) => {
    e.preventDefault();
    setListError('');
    setListSuccess('');
    setListLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', listName);
      formData.append('source_url', listSourceUrl);
      if (listLogoFile) formData.append('logo', listLogoFile);

      if (isEdit) {
        await updateElectionList(id, formData);
        setListSuccess('Lista actualizada correctamente');
        setListLogoFile(null);
        fetchData();
      } else {
        const res = await createElectionList(formData);
        navigate(`/admin/elecciones/${res.data.data.id}/editar`);
      }
    } catch (err) {
      setListError(err.response?.data?.message || 'Error al guardar la lista');
    } finally {
      setListLoading(false);
    }
  };

  const resetCandidateForm = () => {
    setEditingCandidate(null);
    setCandForm(emptyCandidateForm);
    setCandPhotoFile(null);
    setCandCvFile(null);
    setCandError('');
  };

  const handleCandidateSubmit = async (e) => {
    e.preventDefault();
    setCandError('');
    setCandLoading(true);
    try {
      const formData = new FormData();
      formData.append('first_name', candForm.first_name);
      formData.append('last_name', candForm.last_name);
      formData.append('position', candForm.position);
      formData.append('order', candForm.order || '0');
      if (candPhotoFile) formData.append('photo', candPhotoFile);
      if (candCvFile) formData.append('cv', candCvFile);

      if (editingCandidate) {
        await updateElectionCandidate(editingCandidate.id, formData);
      } else {
        await createElectionCandidate(list.id, formData);
      }
      resetCandidateForm();
      fetchData();
    } catch (err) {
      setCandError(err.response?.data?.message || 'Error al guardar el candidato');
    } finally {
      setCandLoading(false);
    }
  };

  const handleEditCandidate = (c) => {
    setEditingCandidate(c);
    setCandForm({
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      position: c.position || '',
      order: String(c.order ?? 0),
    });
    setCandPhotoFile(null);
    setCandCvFile(null);
    setCandError('');
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (!window.confirm('¿Eliminar este candidato?')) return;
    await deleteElectionCandidate(candidateId);
    if (editingCandidate?.id === candidateId) resetCandidateForm();
    fetchData();
  };

  const resetProposalForm = () => {
    setEditingProposal(null);
    setPropForm(emptyProposalForm);
    setPropError('');
    resetCommitmentForm();
  };

  const handleProposalSubmit = async (e) => {
    e.preventDefault();
    setPropError('');
    setPropLoading(true);
    try {
      const payload = {
        title: propForm.title,
        description: propForm.description,
        no_commitments_reason: propForm.no_commitments_reason || null,
        order: propForm.order !== '' ? parseInt(propForm.order, 10) : 0,
      };

      if (editingProposal) {
        await updateElectionProposal(editingProposal.id, payload);
      } else {
        await createElectionProposal(list.id, payload);
      }
      resetProposalForm();
      fetchData();
    } catch (err) {
      setPropError(err.response?.data?.message || 'Error al guardar la propuesta');
    } finally {
      setPropLoading(false);
    }
  };

  const handleEditProposal = (p) => {
    setEditingProposal(p);
    setPropForm({
      title: p.title || '',
      description: p.description || '',
      no_commitments_reason: p.no_commitments_reason || '',
      order: String(p.order ?? 0),
    });
    setPropError('');
    resetCommitmentForm();
  };

  const handleDeleteProposal = async (proposalId) => {
    if (!window.confirm('¿Eliminar esta propuesta? También se eliminarán sus compromisos.')) return;
    await deleteElectionProposal(proposalId);
    if (editingProposal?.id === proposalId) resetProposalForm();
    fetchData();
  };

  const resetCommitmentForm = () => {
    setEditingCommitment(null);
    setCommitForm(emptyCommitmentForm);
    setCommitError('');
  };

  const handleCommitmentSubmit = async (e) => {
    e.preventDefault();
    setCommitError('');
    setCommitLoading(true);
    try {
      const payload = {
        kind: commitForm.kind,
        description: commitForm.description,
        metric_value: commitForm.kind === 'meta' && commitForm.metric_value !== '' ? commitForm.metric_value : null,
        metric_unit: commitForm.kind === 'meta' && commitForm.metric_unit !== '' ? commitForm.metric_unit : null,
        deadline: commitForm.kind === 'meta' && commitForm.deadline !== '' ? commitForm.deadline : null,
      };
      if (editingCommitment) {
        await updateElectionCommitment(editingCommitment.id, payload);
      } else {
        await createElectionCommitment(editingProposal.id, payload);
      }
      resetCommitmentForm();
      fetchData();
    } catch (err) {
      setCommitError(err.response?.data?.message || 'Error al guardar el compromiso');
    } finally {
      setCommitLoading(false);
    }
  };

  const handleEditCommitment = (c) => {
    setEditingCommitment(c);
    setCommitForm({
      kind: c.kind || 'compromiso',
      description: c.description || '',
      metric_value: c.metric_value ?? '',
      metric_unit: c.metric_unit || '',
      deadline: c.deadline || '',
    });
    setCommitError('');
  };

  const handleDeleteCommitment = async (commitmentId) => {
    if (!window.confirm('¿Eliminar este compromiso?')) return;
    await deleteElectionCommitment(commitmentId);
    if (editingCommitment?.id === commitmentId) resetCommitmentForm();
    fetchData();
  };

  if (loading) return <Loader />;

  const candidates = list?.candidates || [];
  const proposals = list?.proposals || [];

  const handleCopyValidationLink = async () => {
    const url = `${window.location.origin}/elecciones/privado/${list.token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copiá el enlace:', url);
    }
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };

  const handleCopyPublicLink = async () => {
    const url = `${window.location.origin}/elecciones/${list.slug}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copiá el enlace:', url);
    }
    setPublicLinkCopied(true);
    setTimeout(() => setPublicLinkCopied(false), 1500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/admin/elecciones" className="text-azul text-sm hover:underline mb-4 inline-block">
        &larr; Volver
      </Link>
      <h1 className="text-2xl font-extrabold mb-2">
        {isEdit ? `Editar lista: ${list?.name ?? ''}` : 'Nueva lista'}
      </h1>

      {isEdit && list && (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>Link de validación (accesible aunque la sección esté desactivada):</span>
          <code className="bg-gray-100 rounded px-2 py-1 text-gray-700 break-all">
            {`${window.location.origin}/elecciones/privado/${list.token}`}
          </code>
          <button type="button" onClick={handleCopyValidationLink} className="text-azul font-medium hover:underline shrink-0">
            {linkCopied ? '¡Copiado!' : 'Copiar'}
          </button>
        </div>
      )}

      {isEdit && list && (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>Link público (funciona solo si la sección Elecciones está activada):</span>
          <code className="bg-gray-100 rounded px-2 py-1 text-gray-700 break-all">
            {`${window.location.origin}/elecciones/${list.slug}`}
          </code>
          <button type="button" onClick={handleCopyPublicLink} className="text-azul font-medium hover:underline shrink-0">
            {publicLinkCopied ? '¡Copiado!' : 'Copiar'}
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* List basic data */}
        <div className="card">
          <h2 className="text-lg font-bold mb-4">Datos de la lista</h2>
          <form onSubmit={handleListSubmit} className="space-y-4">
            {listError && <ErrorMessage message={listError} />}
            {listSuccess && (
              <div className="p-3 bg-green-50 text-green-700 rounded-lg text-sm">{listSuccess}</div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Nombre de la lista *</label>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                className="input-field w-full"
                placeholder="Ej: Lista Azul y Blanco"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fuente (URL) *</label>
              <input
                type="url"
                value={listSourceUrl}
                onChange={(e) => setListSourceUrl(e.target.value)}
                className="input-field w-full"
                placeholder="https://ejemplo.com/propuestas"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Página exacta de donde se extrajeron las propuestas. Queda guardada para poder verificar contra el original.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Logo</label>
              {isEdit && list?.has_logo && (
                <img
                  src={getElectionListLogoUrl(list.id)}
                  alt={list.name}
                  className="w-16 h-16 rounded object-cover mb-2"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setListLogoFile(e.target.files[0] || null)}
                className={fileInputClass}
              />
            </div>
            <button type="submit" disabled={listLoading} className="btn-primary">
              {listLoading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear lista'}
            </button>
          </form>
        </div>

        {!isEdit && (
          <p className="text-sm text-gray-400">
            Primero creá la lista para poder agregar candidatos y propuestas.
          </p>
        )}

        {isEdit && list && (
          <>
            {/* Candidates */}
            <div className="card">
              <h2 className="text-lg font-bold mb-4">Candidatos</h2>

              {candidates.length > 0 && (
                <div className="mb-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-gray-500 uppercase">
                        <th className="pb-3 pr-4">Foto</th>
                        <th className="pb-3 pr-4">Nombre</th>
                        <th className="pb-3 pr-4">Puesto</th>
                        <th className="pb-3 pr-4">CV</th>
                        <th className="pb-3 pr-4 text-right">Orden</th>
                        <th className="pb-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((c) => (
                        <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 pr-4">
                            {c.has_photo ? (
                              <img
                                src={getElectionCandidatePhotoUrl(c.id)}
                                alt={`${c.first_name} ${c.last_name}`}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="py-2 pr-4 font-medium">{c.first_name} {c.last_name}</td>
                          <td className="py-2 pr-4 text-gray-600">{c.position}</td>
                          <td className="py-2 pr-4">
                            {c.has_cv ? (
                              <a
                                href={getElectionCandidateCvUrl(c.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                Ver CV
                              </a>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-right text-gray-500">{c.order}</td>
                          <td className="py-2 whitespace-nowrap">
                            <button
                              onClick={() => handleEditCandidate(c)}
                              className="text-blue-600 text-xs mr-3 hover:underline"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteCandidate(c.id)}
                              className="text-red-600 text-xs hover:underline"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <form onSubmit={handleCandidateSubmit} className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  {editingCandidate ? `Editando: ${editingCandidate.first_name} ${editingCandidate.last_name}` : 'Agregar candidato'}
                </h3>
                {candError && <ErrorMessage message={candError} />}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={candForm.first_name}
                      onChange={(e) => setCandForm((f) => ({ ...f, first_name: e.target.value }))}
                      className="input-field w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Apellido *</label>
                    <input
                      type="text"
                      value={candForm.last_name}
                      onChange={(e) => setCandForm((f) => ({ ...f, last_name: e.target.value }))}
                      className="input-field w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Puesto a ocupar *</label>
                    <input
                      type="text"
                      value={candForm.position}
                      onChange={(e) => setCandForm((f) => ({ ...f, position: e.target.value }))}
                      className="input-field w-full"
                      placeholder="Ej: Presidente"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Orden</label>
                    <input
                      type="number"
                      min="0"
                      value={candForm.order}
                      onChange={(e) => setCandForm((f) => ({ ...f, order: e.target.value }))}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Foto</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setCandPhotoFile(e.target.files[0] || null)}
                      className={fileInputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">CV (opcional)</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setCandCvFile(e.target.files[0] || null)}
                      className={fileInputClass}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={candLoading} className="btn-primary text-sm">
                    {candLoading ? 'Guardando...' : editingCandidate ? 'Actualizar candidato' : 'Agregar candidato'}
                  </button>
                  {editingCandidate && (
                    <button type="button" onClick={resetCandidateForm} className="btn-secondary text-sm">
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Proposals */}
            <div className="card">
              <h2 className="text-lg font-bold mb-4">Propuestas</h2>

              {proposals.length > 0 && (
                <div className="mb-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-gray-500 uppercase">
                        <th className="pb-3 pr-4">Título</th>
                        <th className="pb-3 pr-4">Compromisos</th>
                        <th className="pb-3 pr-4 text-right">Orden</th>
                        <th className="pb-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proposals.map((p) => (
                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 pr-4 font-medium">{p.title}</td>
                          <td className="py-2 pr-4 text-gray-500">{p.commitments?.length ?? 0}</td>
                          <td className="py-2 pr-4 text-right text-gray-500">{p.order}</td>
                          <td className="py-2 whitespace-nowrap">
                            <button
                              onClick={() => handleEditProposal(p)}
                              className="text-blue-600 text-xs mr-3 hover:underline"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteProposal(p.id)}
                              className="text-red-600 text-xs hover:underline"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <form onSubmit={handleProposalSubmit} className="space-y-3 border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-700">
                  {editingProposal ? `Editando: ${editingProposal.title}` : 'Agregar propuesta'}
                </h3>
                {propError && <ErrorMessage message={propError} />}
                <div>
                  <label className="block text-xs font-medium mb-1">Título *</label>
                  <input
                    type="text"
                    value={propForm.title}
                    onChange={(e) => setPropForm((f) => ({ ...f, title: e.target.value }))}
                    className="input-field w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Desarrollo *</label>
                  <textarea
                    value={propForm.description}
                    onChange={(e) => setPropForm((f) => ({ ...f, description: e.target.value }))}
                    className="input-field w-full"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Motivo si no hay compromisos/metas
                  </label>
                  <textarea
                    value={propForm.no_commitments_reason}
                    onChange={(e) => setPropForm((f) => ({ ...f, no_commitments_reason: e.target.value }))}
                    className="input-field w-full"
                    rows={2}
                    placeholder="Ej: Declara una intención general sin describir acciones, obras o mecanismos concretos."
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Completar solo si esta propuesta queda sin compromisos ni metas — explica por qué no se pudo extraer nada verificable.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Orden</label>
                  <input
                    type="number"
                    min="0"
                    value={propForm.order}
                    onChange={(e) => setPropForm((f) => ({ ...f, order: e.target.value }))}
                    className="input-field w-full sm:w-32"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={propLoading} className="btn-primary text-sm">
                    {propLoading ? 'Guardando...' : editingProposal ? 'Actualizar propuesta' : 'Agregar propuesta'}
                  </button>
                  {editingProposal && (
                    <button type="button" onClick={resetProposalForm} className="btn-secondary text-sm">
                      Cancelar
                    </button>
                  )}
                </div>
              </form>

              {editingProposal && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Compromisos de: {editingProposal.title}
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">
                    Un compromiso comprobable es una acción concreta y comprobable (crear algo, alcanzar una meta indiscutible). Incluí en el texto la forma de evaluarlo.
                  </p>

                  {(editingProposal.commitments?.length ?? 0) > 0 && (
                    <ul className="space-y-2 mb-4">
                      {editingProposal.commitments.map((c) => (
                        <li key={c.id} className="flex items-start gap-2 text-sm bg-gray-50 rounded px-3 py-2">
                          <span
                            className={`shrink-0 mt-0.5 text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 ${
                              c.kind === 'meta' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-azul'
                            }`}
                          >
                            {c.kind === 'meta' ? 'Meta' : 'Compromiso'}
                          </span>
                          <span className="flex-1">
                            {c.description}
                            {c.kind === 'meta' && (c.metric_value || c.metric_unit || c.deadline) && (
                              <span className="block text-xs text-amber-700 mt-0.5">
                                {[
                                  c.metric_value != null ? `${c.metric_value}${c.metric_unit ? ` ${c.metric_unit}` : ''}` : c.metric_unit,
                                  c.deadline,
                                ].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </span>
                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEditCommitment(c)}
                              className="text-blue-600 text-xs hover:underline"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCommitment(c.id)}
                              className="text-red-600 text-xs hover:underline"
                            >
                              Eliminar
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <form onSubmit={handleCommitmentSubmit} className="space-y-2">
                    {commitError && <ErrorMessage message={commitError} />}
                    <div>
                      <label className="block text-xs font-medium mb-1">Tipo</label>
                      <select
                        value={commitForm.kind}
                        onChange={(e) => setCommitForm((f) => ({ ...f, kind: e.target.value }))}
                        className="input-field w-full sm:w-48"
                      >
                        <option value="compromiso">Compromiso comprobable</option>
                        <option value="meta">Meta (con métrica)</option>
                      </select>
                    </div>
                    <textarea
                      value={commitForm.description}
                      onChange={(e) => setCommitForm((f) => ({ ...f, description: e.target.value }))}
                      className="input-field w-full"
                      rows={2}
                      placeholder="Ej: Creación de la Secretaría Técnica como área responsable del proyecto futbolístico del club."
                      required
                    />
                    {commitForm.kind === 'meta' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium mb-1">Valor</label>
                          <input
                            type="number"
                            step="any"
                            value={commitForm.metric_value}
                            onChange={(e) => setCommitForm((f) => ({ ...f, metric_value: e.target.value }))}
                            className="input-field w-full"
                            placeholder="Ej: 30"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Unidad</label>
                          <input
                            type="text"
                            value={commitForm.metric_unit}
                            onChange={(e) => setCommitForm((f) => ({ ...f, metric_unit: e.target.value }))}
                            className="input-field w-full"
                            placeholder="Ej: % de adopción"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Plazo</label>
                          <input
                            type="text"
                            value={commitForm.deadline}
                            onChange={(e) => setCommitForm((f) => ({ ...f, deadline: e.target.value }))}
                            className="input-field w-full"
                            placeholder="Ej: primer año de gestión"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button type="submit" disabled={commitLoading} className="btn-primary text-sm">
                        {commitLoading ? 'Guardando...' : editingCommitment ? 'Actualizar compromiso' : 'Agregar compromiso'}
                      </button>
                      {editingCommitment && (
                        <button type="button" onClick={resetCommitmentForm} className="btn-secondary text-sm">
                          Cancelar
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
