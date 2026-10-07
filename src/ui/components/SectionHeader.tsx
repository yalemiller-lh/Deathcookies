import type { ReactNode } from 'react';

export function SectionHeader({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <div className="section-head">
      <h2 className="section-title">{title}</h2>
      {meta !== undefined && <span className="section-meta">{meta}</span>}
    </div>
  );
}
