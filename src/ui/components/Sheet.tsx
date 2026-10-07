import { useEffect, useId, useRef, type ReactNode } from 'react';

/** Bottom sheet over a dimmed page. Tapping the dim area or pressing Escape closes it. */
export function Sheet({ onClose, tall, children }: { onClose: () => void; tall?: boolean; children: (titleId: string) => ReactNode }) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => { document.removeEventListener('keydown', onKey); previous?.focus?.(); };
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div ref={ref} className={`sheet${tall ? ' sheet--tall' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onClick={e => e.stopPropagation()}>
        <div className="grabber" />
        {children(titleId)}
      </div>
    </div>
  );
}
