import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getBalanceItems,
  createBalanceItem,
  updateBalanceItem,
  deleteBalanceItem,
  createBalanceSubitem,
  updateBalanceSubitem,
  deleteBalanceSubitem,
} from '../api/endpoints';
import Loader from '../components/common/Loader';
import ErrorMessage from '../components/common/ErrorMessage';

export default function AdminBalanceItemsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New item form
  const [newItemName, setNewItemName] = useState('');
  const [newItemOrder, setNewItemOrder] = useState('');
  const [addingItem, setAddingItem] = useState(false);

  // Edit item
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemOrder, setEditItemOrder] = useState('');

  // New subitem form (keyed by item id)
  const [newSubitemName, setNewSubitemName] = useState({});
  const [expandedItems, setExpandedItems] = useState({});

  const fetchItems = useCallback(() => {
    setLoading(true);
    getBalanceItems()
      .then((res) => setItems(res.data?.data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setAddingItem(true);
    setError('');
    try {
      await createBalanceItem({ name: newItemName.trim(), order: parseInt(newItemOrder) || 0 });
      setNewItemName('');
      setNewItemOrder('');
      fetchItems();
    } catch {
      setError('Error al crear el item');
    } finally {
      setAddingItem(false);
    }
  };

  const handleEditItem = async (item) => {
    setEditingItemId(item.id);
    setEditItemName(item.name);
    setEditItemOrder(String(item.order));
  };

  const handleSaveItem = async (itemId) => {
    setError('');
    try {
      await updateBalanceItem(itemId, { name: editItemName.trim(), order: parseInt(editItemOrder) || 0 });
      setEditingItemId(null);
      fetchItems();
    } catch {
      setError('Error al actualizar el item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (!window.confirm('¿Eliminar este item? También se eliminarán sus subitems y los registros asociados.')) return;
    try {
      await deleteBalanceItem(id);
      fetchItems();
    } catch {
      setError('Error al eliminar el item');
    }
  };

  const handleAddSubitem = async (itemId, e) => {
    e.preventDefault();
    const name = newSubitemName[itemId]?.trim();
    if (!name) return;
    setError('');
    try {
      await createBalanceSubitem(itemId, { name });
      setNewSubitemName((prev) => ({ ...prev, [itemId]: '' }));
      fetchItems();
    } catch {
      setError('Error al crear el subitem');
    }
  };

  const handleDeleteSubitem = async (itemId, subitemId) => {
    if (!window.confirm('¿Eliminar este subitem?')) return;
    try {
      await deleteBalanceSubitem(itemId, subitemId);
      fetchItems();
    } catch {
      setError('Error al eliminar el subitem');
    }
  };

  const toggleExpand = (id) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) return <Loader />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/admin/balances" className="text-azul text-sm hover:underline">&larr; Balances</Link>
        <h1 className="text-2xl font-extrabold">Catálogo de items</h1>
        <p className="text-sm text-gray-500 mt-1">
          Administrá los items y subitems que se usan para categorizar el desglose de los balances.
        </p>
      </div>

      {error && <ErrorMessage message={error} />}

      {/* Add new item */}
      <div className="card mb-6">
        <h2 className="text-base font-bold mb-3">Agregar item</h2>
        <form onSubmit={handleAddItem} className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Nombre</label>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="input-field w-full"
              placeholder="Ej: Ingresos operativos"
              required
            />
          </div>
          <div className="w-24">
            <label className="block text-xs font-medium mb-1">Orden</label>
            <input
              type="number"
              value={newItemOrder}
              onChange={(e) => setNewItemOrder(e.target.value)}
              className="input-field w-full"
              placeholder="0"
              min="0"
            />
          </div>
          <button type="submit" disabled={addingItem} className="btn-primary text-sm px-4 py-2">
            {addingItem ? '...' : '+ Agregar'}
          </button>
        </form>
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          No hay items configurados aún.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="card">
              {/* Item header */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={expandedItems[item.id] ? 'Contraer' : 'Expandir'}
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${expandedItems[item.id] ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {editingItemId === item.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editItemName}
                      onChange={(e) => setEditItemName(e.target.value)}
                      className="input-field flex-1 text-sm py-1"
                    />
                    <input
                      type="number"
                      value={editItemOrder}
                      onChange={(e) => setEditItemOrder(e.target.value)}
                      className="input-field w-16 text-sm py-1"
                      placeholder="Orden"
                    />
                    <button onClick={() => handleSaveItem(item.id)} className="text-green-600 text-xs font-semibold hover:underline">
                      Guardar
                    </button>
                    <button onClick={() => setEditingItemId(null)} className="text-gray-400 text-xs hover:underline">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{item.name}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        #{item.order}
                      </span>
                      <span className="text-xs text-gray-400">
                        {item.subitems?.length || 0} subitems
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEditItem(item)} className="text-blue-500 text-xs hover:underline">
                        Editar
                      </button>
                      <button onClick={() => handleDeleteItem(item.id)} className="text-red-500 text-xs hover:underline">
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Subitems (collapsed by default) */}
              {expandedItems[item.id] && (
                <div className="mt-3 pl-7">
                  {item.subitems?.length > 0 && (
                    <ul className="space-y-1 mb-3">
                      {item.subitems.map((sub) => (
                        <li key={sub.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50">
                          <span className="text-gray-700">{sub.name}</span>
                          <button
                            onClick={() => handleDeleteSubitem(item.id, sub.id)}
                            className="text-red-400 text-xs hover:underline"
                          >
                            Eliminar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* Add subitem */}
                  <form onSubmit={(e) => handleAddSubitem(item.id, e)} className="flex gap-2">
                    <input
                      type="text"
                      value={newSubitemName[item.id] || ''}
                      onChange={(e) => setNewSubitemName((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      className="input-field flex-1 text-sm py-1"
                      placeholder="Nombre del subitem"
                    />
                    <button type="submit" className="btn-secondary text-xs px-3 py-1">
                      + Subitem
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
