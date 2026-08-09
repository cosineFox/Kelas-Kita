import { useCallback, useEffect, useState } from "react";

const storageKey = "kelaskita-parody-gate";

export const shouldShowParodyGate = () => {
  try {
    return sessionStorage.getItem(storageKey) !== "seen";
  } catch {
    return true;
  }
};

const rememberGate = () => {
  try {
    sessionStorage.setItem(storageKey, "seen");
  } catch {
    // The parody still works when storage is unavailable.
  }
};

export default function ParodyGate({ open, onClose }) {
  const [leaving, setLeaving] = useState(false);

  const dismiss = useCallback(() => {
    if (leaving) return;
    rememberGate();
    setLeaving(true);
    window.setTimeout(onClose, 380);
  }, [leaving, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(dismiss, reducedMotion ? 450 : 2_650);
    return () => window.clearTimeout(timer);
  }, [dismiss, open]);

  if (!open) return null;

  return (
    <section className={`parody-gate ${leaving ? "is-leaving" : ""}`} role="dialog" aria-modal="true" aria-labelledby="parody-gate-title">
      <div className="gate-grid" aria-hidden="true" />
      <header className="gate-header">
        <span>DEFINITELY NOT ANUBIS™</span>
        <span>GATE 404 · BUILD 0.0.0</span>
      </header>
      <div className="gate-body">
        <div className="gate-seal" aria-hidden="true">
          <svg viewBox="0 0 160 180">
            <path d="M34 76 15 18l49 35h32l49-35-19 58-10 72-36 25-36-25Z" />
            <path d="m56 91 19 8-22 10m51-18-19 8 22 10M80 99v48" />
            <path d="m60 145 20 14 20-14" />
          </svg>
          <span>VIBE<br />CHECK</span>
        </div>
        <div className="gate-copy">
          <p className="gate-kicker">The Department of Suspicious Academics presents</p>
          <h1 id="parody-gate-title">Weighing your<br /><em>academic soul.</em></h1>
          <p className="gate-intro">One browser. One feather. Absolutely no scientific validity.</p>
          <ol className="gate-checks" aria-label="Parody checks in progress">
            <li>checking for suspiciously fast clicking</li>
            <li>consulting the sacred attendance sheet</li>
            <li>pretending this was extremely technical</li>
          </ol>
          <div className="gate-progress" aria-hidden="true"><span /></div>
        </div>
      </div>
      <footer className="gate-footer">
        <p>Parody screen only. Real bot checks happen when something is submitted.</p>
        <button type="button" onClick={dismiss} autoFocus>skip the ritual →</button>
      </footer>
    </section>
  );
}
