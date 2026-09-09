import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold">Panel de Administracion</h1>
          <p className="text-gray-500 text-sm">Bienvenido, {user?.name}</p>
        </div>
        <button onClick={logout} className="btn-secondary text-sm">
          Cerrar sesion
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Link to="/admin/economia" className="card hover:shadow-md transition-shadow">
          <h2 className="text-lg font-bold mb-1">Economia</h2>
          <p className="text-sm text-gray-500">Gestionar registros economicos</p>
        </Link>
        <Link to="/admin/contratos" className="card hover:shadow-md transition-shadow">
          <h2 className="text-lg font-bold mb-1">Contratos</h2>
          <p className="text-sm text-gray-500">Gestionar contratos de jugadores</p>
        </Link>
        <Link to="/admin/derechos" className="card hover:shadow-md transition-shadow">
          <h2 className="text-lg font-bold mb-1">Derechos</h2>
          <p className="text-sm text-gray-500">Gestionar derechos sobre jugadores</p>
        </Link>
        <Link to="/admin/rumores" className="card hover:shadow-md transition-shadow">
          <h2 className="text-lg font-bold mb-1">Rumores del mercado</h2>
          <p className="text-sm text-gray-500">Gestionar posibles refuerzos rumoreados</p>
        </Link>
        <Link to="/admin/mercados" className="card hover:shadow-md transition-shadow">
          <h2 className="text-lg font-bold mb-1">Mercados</h2>
          <p className="text-sm text-gray-500">Crear y gestionar mercados de pases</p>
        </Link>
        <Link to="/admin/balances" className="card hover:shadow-md transition-shadow">
          <h2 className="text-lg font-bold mb-1">Balances</h2>
          <p className="text-sm text-gray-500">Gestionar balances oficiales</p>
        </Link>
        <Link to="/admin/estadio" className="card hover:shadow-md transition-shadow">
          <h2 className="text-lg font-bold mb-1">Estadio</h2>
          <p className="text-sm text-gray-500">Gestionar estadio, sectores y precios de entradas</p>
        </Link>
        <Link to="/admin/elecciones" className="card hover:shadow-md transition-shadow">
          <h2 className="text-lg font-bold mb-1">Elecciones</h2>
          <p className="text-sm text-gray-500">Gestionar listas, candidatos y propuestas</p>
        </Link>
        <Link to="/admin/configuracion" className="card hover:shadow-md transition-shadow">
          <h2 className="text-lg font-bold mb-1">Configuracion</h2>
          <p className="text-sm text-gray-500">Cambiar contrasena y API Keys</p>
        </Link>
      </div>
    </div>
  );
}
