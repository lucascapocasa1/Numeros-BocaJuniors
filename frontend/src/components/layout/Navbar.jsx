import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useSectionSettings from '../../hooks/useSectionSettings';

const ALL_NAV_LINKS = [
  { to: '/', label: 'Rumores', scrollTo: 'rumores', isAnchor: true, sectionKey: 'section_rumores_enabled' },
  { to: '/', label: 'Elecciones', scrollTo: 'elecciones', isAnchor: true, sectionKey: 'section_elecciones_enabled' },
  { to: '/', label: 'Economia', scrollTo: 'compromisos-economicos', isAnchor: true, sectionKey: 'section_economia_enabled' },
  { to: '/', label: 'Contratos', scrollTo: 'contratos', isAnchor: true, sectionKey: 'section_contratos_enabled' },
  { to: '/', label: 'Derechos', scrollTo: 'derechos', isAnchor: true, sectionKey: 'section_derechos_enabled' },
  { to: '/', label: 'Balances', scrollTo: 'balances', isAnchor: true, sectionKey: 'section_balances_enabled' },
  { to: '/', label: 'Estadísticas', scrollTo: 'estadisticas', isAnchor: true, sectionKey: null },
  { to: '/', label: 'Estadio', scrollTo: 'estadio', isAnchor: true, sectionKey: 'section_estadio_enabled' },
  { to: '/', label: 'Metodologia', scrollTo: 'metodologia', isAnchor: true, sectionKey: null },
];

const scrollToSection = (scrollToId) => {
  const element = document.getElementById(scrollToId);
  if (element) {
    const navbarHeight = 56; // h-14
    const top = element.getBoundingClientRect().top + window.scrollY - navbarHeight;
    window.scrollTo({ top, behavior: 'smooth' });
  }
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { sections } = useSectionSettings();

  const navLinks = ALL_NAV_LINKS.filter(
    (link) => link.sectionKey === null || sections[link.sectionKey] !== false
  );

  // Scroll to section after navigating from another route.
  // Uses ResizeObserver to wait for async sections to finish loading
  // before measuring position, then scrolls once layout is stable.
  useEffect(() => {
    if (location.pathname !== '/' || !location.state?.scrollTo) return;

    const scrollToId = location.state.scrollTo;
    let scrolled = false;
    let debounceTimer = null;

    const doScroll = () => {
      if (scrolled) return;
      const element = document.getElementById(scrollToId);
      if (!element) return;
      scrolled = true;
      resizeObserver.disconnect();
      scrollToSection(scrollToId);
    };

    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(doScroll, 150);
    });

    resizeObserver.observe(document.body);

    // Fallback: scroll after 2.5s regardless
    const fallback = setTimeout(() => {
      clearTimeout(debounceTimer);
      resizeObserver.disconnect();
      doScroll();
    }, 2500);

    return () => {
      clearTimeout(debounceTimer);
      clearTimeout(fallback);
      resizeObserver.disconnect();
    };
  }, [location.state]);

  const handleNavClick = (e, link) => {
    if (!link.isAnchor) return;
    e.preventDefault();
    setOpen(false);

    if (location.pathname === '/') {
      // Already on home: defer scroll until mobile menu closes and layout stabilizes
      const scrollToId = link.scrollTo;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToSection(scrollToId);
        });
      });
    } else {
      // Navigate to home passing scroll target via state (no hash, avoids browser/router conflicts)
      navigate('/', { state: { scrollTo: link.scrollTo } });
    }
  };

  const isLinkActive = (link) => {
    if (link.isAnchor) {
      return false;
    }
    return location.pathname.startsWith(link.to);
  };

  return (
    <nav className="bg-azul text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="font-extrabold text-lg tracking-tight">
            NUMEROS ROJOS
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.scrollTo}
                to={link.to}
                onClick={(e) => handleNavClick(e, link)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isLinkActive(link)
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && (
              <Link
                to="/admin"
                className="ml-2 px-3 py-2 rounded-lg text-sm font-medium bg-white/20 hover:bg-white/30"
              >
                Admin
              </Link>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10"
            aria-label="Menu"
            aria-expanded={open}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.scrollTo}
                to={link.to}
                onClick={(e) => handleNavClick(e, link)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  isLinkActive(link)
                    ? 'bg-white/20'
                    : 'hover:bg-white/10'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium bg-white/20"
              >
                Admin
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
