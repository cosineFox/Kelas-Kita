import { FileText } from "lucide-react";
import { useState } from "react";

const termsVersion = "core-0.1";
const cookieName = "kelaskita_terms";

export const hasAcceptedTerms = () => document.cookie
  .split("; ")
  .some((cookie) => cookie === `${cookieName}=${termsVersion}`);

const rememberAcceptance = () => {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${cookieName}=${termsVersion}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
};

export default function TermsGate({ open, onAccept, onReadTerms }) {
  const [checked, setChecked] = useState(false);

  if (!open) return null;

  return (
    <section className="terms-gate" role="dialog" aria-modal="true" aria-labelledby="terms-gate-title">
      <div className="terms-card">
        <header><FileText /><span>TERMS CHECK · {termsVersion}</span></header>
        <div className="terms-copy">
          <p className="terms-kicker">Before you join the class pile</p>
          <h1 id="terms-gate-title">Keep it first-hand.</h1>
          <p>Review teaching and courses from your own experience. Do not post threats, personal information, rumours or grave allegations.</p>
          <label className="terms-consent">
            <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} autoFocus />
            <span>I am 18 or older and agree to the Community Rules, Terms and Privacy Notice.</span>
          </label>
        </div>
        <footer>
          <button type="button" className="terms-read" onClick={onReadTerms}>Read the terms</button>
          <button
            type="button"
            className="terms-accept"
            disabled={!checked}
            onClick={() => { rememberAcceptance(); onAccept(); }}
          >Agree and enter</button>
        </footer>
      </div>
    </section>
  );
}
