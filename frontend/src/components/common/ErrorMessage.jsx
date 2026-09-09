export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
      <div className="text-azul text-3xl">⚠</div>
      <p className="text-gray-700 font-medium">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary text-sm px-4 py-2">
          Reintentar
        </button>
      )}
    </div>
  );
}
