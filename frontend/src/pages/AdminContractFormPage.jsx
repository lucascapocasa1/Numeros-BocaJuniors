import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getContract, createContract, updateContract, saveContractAsChange } from '../api/endpoints';
import ContractForm from '../components/admin/ContractForm';
import Loader from '../components/common/Loader';

export default function AdminContractFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      getContract(id)
        .then((res) => setInitial(res.data.data))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleSubmit = async (data) => {
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await updateContract(id, data);
      } else {
        await createContract(data);
      }
      navigate('/admin/contratos');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAsChange = async (data) => {
    setSaving(true);
    setError('');
    try {
      await saveContractAsChange(id, data);
      navigate('/admin/contratos');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar como cambio de condiciones');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/admin/contratos" className="text-azul text-sm hover:underline mb-4 inline-block">
        &larr; Volver
      </Link>
      <h1 className="text-2xl font-extrabold mb-6">
        {isEdit ? 'Editar contrato' : 'Nuevo contrato'}
      </h1>

      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 rounded-lg p-3">{error}</p>}

      <div className="card">
        <ContractForm
          initial={initial}
          onSubmit={handleSubmit}
          onSubmitAsChange={isEdit ? handleSubmitAsChange : undefined}
          loading={saving}
        />
      </div>
    </div>
  );
}
