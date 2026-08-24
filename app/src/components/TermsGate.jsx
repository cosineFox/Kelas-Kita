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
        <header><FileText /><span>{termsVersion}</span></header>
        <div className="terms-copy">
          <p className="terms-kicker">Before you post</p>
          <h1 id="terms-gate-title">Read this first.</h1>
          <p>Write about your own experience. Leave out threats, personal information, rumours and serious misconduct allegations.</p>
          <label className="terms-consent">
            <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} autoFocus />
            <span>I am 18 or older and agree to the rules, actual terms and privacy notice.</span>
          </label>
        </div>
        <footer>
          <button type="button" className="terms-read" onClick={onReadTerms}>Read the terms</button>
          <button
            type="button"
            className="terms-accept"
            disabled={!checked}
            onClick={() => { rememberAcceptance(); onAccept(); }}
          >Agree and continue</button>
        </footer>
      </div>
    </section>
  );
}
