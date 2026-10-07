import { useEffect, useState } from 'react';
import type { UpdateWatcher } from '../services/updates';

/** Offers a reload once a newer version has been deployed. Styled like the design's notification card. */
export function UpdateBanner({ watch, reload }: { watch: UpdateWatcher; reload: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => watch(() => setReady(true)), [watch]);
  if (!ready) return null;
  return (
    <div className="update-bar" role="status">
      <div className="update-icon" aria-hidden="true"><span /></div>
      <div className="update-text">
        <span className="update-app">Deathcookies</span>
        <span>A new version is ready.</span>
      </div>
      <button className="btn-primary update-btn" onClick={reload}>Update</button>
    </div>
  );
}
