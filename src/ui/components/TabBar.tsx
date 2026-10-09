export type Tab = 'today' | 'rejection';

const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'rejection', label: 'Rejection Therapy' },
];

/** The bottom tab bar, on every screen. */
export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tab-bar" role="tablist" aria-label="Sections">
      {TABS.map(t => (
        <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab${tab === t.id ? ' is-on' : ''}`} onClick={() => onChange(t.id)}>
          <span className="tab-indicator" aria-hidden="true" />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
