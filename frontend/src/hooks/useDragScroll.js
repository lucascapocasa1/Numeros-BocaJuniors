import { useRef, useEffect, useCallback } from 'react';

export function useDragScroll() {
  const ref = useRef(null);
  const isDragging = useRef(false);
  const didDrag = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // Intercept clicks in capture phase to prevent card clicks after a drag
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleClickCapture = (e) => {
      if (didDrag.current) {
        e.stopPropagation();
        didDrag.current = false;
      }
    };
    el.addEventListener('click', handleClickCapture, true);
    return () => el.removeEventListener('click', handleClickCapture, true);
  }, []);

  const onMouseDown = useCallback((e) => {
    if (!ref.current) return;
    isDragging.current = true;
    didDrag.current = false;
    startX.current = e.pageX - ref.current.offsetLeft;
    scrollLeft.current = ref.current.scrollLeft;
    ref.current.style.cursor = 'grabbing';
    ref.current.style.userSelect = 'none';
  }, []);

  const stopDrag = useCallback(() => {
    isDragging.current = false;
    if (ref.current) {
      ref.current.style.cursor = 'grab';
      ref.current.style.userSelect = '';
    }
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!isDragging.current || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = x - startX.current;
    if (Math.abs(walk) > 5) {
      didDrag.current = true;
    }
    ref.current.scrollLeft = scrollLeft.current - walk;
  }, []);

  return {
    ref,
    onMouseDown,
    onMouseUp: stopDrag,
    onMouseLeave: stopDrag,
    onMouseMove,
  };
}
