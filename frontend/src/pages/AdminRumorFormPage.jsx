import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getRumor, createRumor, updateRumor } from '../api/endpoints';
import RumorForm from '../components/admin/RumorForm';
import Loader from '../components/common/Loader';

export default function AdminRumorFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit) {
      getRumor(id)
        .then((res) => setInitial(res.data.data))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleSubmit = async (data) => {
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await updateRumor(id, data);
      } else {
        await createRumor(data);
      }
      navigate('/admin/rumores');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/admin/rumores" className="text-azul text-sm hover:underline mb-4 inline-block">
        &larr; Volver
      </Link>
      <h1 className="text-2xl font-extrabold mb-6">
        {isEdit ? 'Editar rumor' : 'Nuevo rumor'}
      </h1>

      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 rounded-lg p-3">{error}</p>}

      <div className="card">
        <RumorForm initial={initial} onSubmit={handleSubmit} loading={saving} />
      </div>
    </div>
  );
}
