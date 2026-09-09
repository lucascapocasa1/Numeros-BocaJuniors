import { useInstallPrompt } from '../../hooks/useInstallPrompt';

export default function InstallBanner() {
  const { canInstall, platform, promptInstall, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3">
        <img
          src="/icons/icon-192.png"
          alt="Números Boca Juniors"
          className="w-10 h-10 rounded-lg flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">Números Boca Juniors siempre a mano</p>
          {platform === 'ios' ? (
            <p className="text-xs text-gray-500 leading-tight">
              Tocá Compartir <span aria-hidden="true">⎋</span> y luego "Agregar a inicio"
            </p>
          ) : (
            <p className="text-xs text-gray-500 leading-tight">
              Agregá el acceso directo a tu pantalla de inicio
            </p>
          )}
        </div>
        {platform === 'android' && (
          <button onClick={promptInstall} className="btn-primary text-sm px-3 py-1.5 flex-shrink-0">
            Instalar
          </button>
        )}
        <button
          onClick={dismiss}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          aria-label="Descartar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
