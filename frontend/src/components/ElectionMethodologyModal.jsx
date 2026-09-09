import { useEffect } from 'react';
import { PROMPT_STEPS } from './electionPromptContent';

const POINTS = [
  {
    title: 'Orden aleatorio',
    body: 'Las listas se muestran en un orden aleatorio que cambia en cada visita. Ninguna agrupación tiene una posición privilegiada.',
  },
  {
    title: 'Extracción de propuestas',
    body: 'Las propuestas se extraen textualmente de la página oficial de cada agrupación (el link "Fuente" de cada lista apunta a esa página). No se resume ni se reescribe el contenido original.',
  },
  {
    title: 'Cómo se calculan compromisos y metas',
    body: 'Un compromiso es una acción concreta que se puede verificar como cumplida o no, sin una cifra objetivo. Una meta es igual, pero además incluye una cifra o umbral cuantificable. Solo se cuentan las propuestas que describen una acción tangible: frases abstractas, sin desarrollo concreto o que solo le ponen nombre a una idea, se descartan.',
  },
  {
    title: 'Por qué usar IA para este análisis',
    body: 'Un modelo de lenguaje analiza las propuestas de todas las listas con el mismo criterio, evitando la fatiga cerebral y el sesgo humano — algo imposible de sostener en un análisis manual sobre decenas de propuestas por lista.',
  },
];

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold text-gray-800">{part.slice(2, -2)}</strong>
      : part
  );
}

export default function ElectionMethodologyModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <p className="font-bold text-base leading-tight">Metodología</p>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-500">
            Así se arma el contenido de esta sección para cada lista que se postula.
          </p>
          {POINTS.map((point) => (
            <div key={point.title}>
              <p className="text-sm font-semibold text-gray-900">{point.title}</p>
              <p className="text-sm text-gray-600 mt-0.5">{point.body}</p>
            </div>
          ))}

          <div>
            <p className="text-sm font-semibold text-gray-900">Detalle técnico</p>
            <p className="text-sm text-gray-600 mt-0.5">
              El análisis se realiza utilizando el modelo <strong className="font-semibold text-gray-800">Claude Sonnet 5</strong>, perteneciente a Anthropic. No hay curación manual de qué cuenta como compromiso o meta: el modelo sigue siempre el mismo instructivo y una auditoría de segunda revisión sobre cada resultado antes de publicarlo. Abajo está el texto real de ese instructivo.
            </p>
          </div>

          <details className="group border-t pt-3">
            <summary className="cursor-pointer text-sm font-semibold text-azul hover:underline select-none list-none flex items-center gap-1">
              <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
              Ver el prompt completo (instructivo real que sigue el modelo)
            </summary>
            <div className="mt-3 space-y-3 bg-gray-50 rounded-lg p-3">
              {PROMPT_STEPS.map((step) => (
                <div key={step.title}>
                  <p className="text-xs font-bold text-gray-800">{step.title}</p>
                  <div className="mt-1 space-y-1.5">
                    {step.blocks.map((block, i) =>
                      block.type === 'ul' ? (
                        <ul key={i} className="space-y-1 pl-0.5">
                          {block.items.map((item, j) => (
                            <li key={j} className="text-xs text-gray-600 leading-relaxed">{renderInline(item)}</li>
                          ))}
                        </ul>
                      ) : (
                        <p key={i} className="text-xs text-gray-600 leading-relaxed">{renderInline(block.text)}</p>
                      )
                    )}
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-gray-400 pt-1 border-t">
                Se omiten acá los pasos puramente operativos de scraping y de carga a la base de datos — el texto completo, incluido el historial de ajustes, está versionado en el repositorio público del proyecto.
              </p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
