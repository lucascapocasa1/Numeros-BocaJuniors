import { useEffect } from 'react';

const BASE_URL = 'https://www.numerosbocajuniors.net';
const DEFAULT_TITLE = 'Números Boca Juniors - Portal de datos del Club Atlético Boca Juniors';
const DEFAULT_OG_TITLE = 'Números Boca Juniors - Portal de datos de Boca Juniors';
const DEFAULT_DESCRIPTION =
  'Los datos económicos, contractuales y deportivos que todo socio de Boca Juniors tiene que saber.';
const DEFAULT_URL = `${BASE_URL}/`;

function setMetaContent(selector, content) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute('content', content);
}

function setCanonical(href) {
  let el = document.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

function setStructuredData(data) {
  let script = document.getElementById('page-structured-data');
  if (data) {
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = 'page-structured-data';
      document.head.appendChild(script);
    }
    script.textContent = data;
  } else if (script) {
    script.remove();
  }
}

/**
 * Hook para gestionar meta tags SEO de forma dinámica en cada página.
 * Actualiza: title, description, OG tags, Twitter Card, canonical y JSON-LD estructurado.
 * Restaura los valores base del sitio al desmontar el componente.
 *
 * @param {object} options
 * @param {string}  options.title          - Título de la página (para <title> y OG/Twitter)
 * @param {string}  options.description    - Meta description de la página
 * @param {string}  options.path           - Path relativo (e.g. "/contratos/5") para canonical y og:url
 * @param {object}  [options.structuredData] - Objeto JSON-LD a inyectar como script (null = no inyectar)
 */
export function usePageMeta({ title, description, path, structuredData } = {}) {
  const structuredDataJson = structuredData ? JSON.stringify(structuredData) : null;

  useEffect(() => {
    if (title) {
      document.title = title;
      setMetaContent('meta[property="og:title"]', title);
      setMetaContent('meta[name="twitter:title"]', title);
    }

    if (description) {
      setMetaContent('meta[name="description"]', description);
      setMetaContent('meta[property="og:description"]', description);
      setMetaContent('meta[name="twitter:description"]', description);
    }

    if (path) {
      const url = `${BASE_URL}${path}`;
      setMetaContent('meta[property="og:url"]', url);
      setCanonical(url);
    }

    setStructuredData(structuredDataJson);

    return () => {
      document.title = DEFAULT_TITLE;
      setMetaContent('meta[name="description"]', DEFAULT_DESCRIPTION);
      setMetaContent('meta[property="og:title"]', DEFAULT_OG_TITLE);
      setMetaContent('meta[property="og:description"]', DEFAULT_DESCRIPTION);
      setMetaContent('meta[property="og:url"]', DEFAULT_URL);
      setMetaContent('meta[name="twitter:title"]', DEFAULT_OG_TITLE);
      setMetaContent('meta[name="twitter:description"]', DEFAULT_DESCRIPTION);
      setCanonical(DEFAULT_URL);
      setStructuredData(null);
    };
  }, [title, description, path, structuredDataJson]);
}
