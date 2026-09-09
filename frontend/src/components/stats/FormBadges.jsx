const MAP = {
  w: { label: 'G', className: 'bg-ingreso text-white' },
  d: { label: 'E', className: 'bg-gray-200 text-gray-600' },
  l: { label: 'P', className: 'bg-egreso text-white' },
};

export default function FormBadges({ form, max = 10 }) {
  const chars = String(form || '').split('').slice(-max);
  return (
    <div className="flex gap-1 flex-wrap">
      {chars.map((c, i) => {
        const m = MAP[c] || MAP.d;
        return (
          <span
            key={i}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${m.className}`}
          >
            {m.label}
          </span>
        );
      })}
    </div>
  );
}
