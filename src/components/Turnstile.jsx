import { useEffect, useRef } from "react";

const testSiteKey = "1x00000000000000000000AA";
const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || (import.meta.env.DEV ? testSiteKey : "");
let scriptPromise;

const loadScript = () => {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-kelaskita-turnstile]');
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.kelaskitaTurnstile = "true";
      document.head.append(script);
    }
    script.addEventListener("load", () => resolve(window.turnstile), { once: true });
    script.addEventListener("error", () => reject(new Error("Turnstile failed to load")), { once: true });
  });
  return scriptPromise;
};

export default function Turnstile({ action, onToken, resetKey = 0 }) {
  const container = useRef(null);

  useEffect(() => {
    let widget;
    let active = true;
    onToken("");

    if (!siteKey) return undefined;
    loadScript().then((turnstile) => {
      if (!active || !container.current) return;
      widget = turnstile.render(container.current, {
        sitekey: siteKey,
        action,
        appearance: "interaction-only",
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    }).catch(() => onToken(""));

    return () => {
      active = false;
      if (widget !== undefined && window.turnstile) window.turnstile.remove(widget);
    };
  }, [action, onToken, resetKey]);

  if (!siteKey) return <p className="turnstile-error">Anti-bot protection is not configured.</p>;
  return <div className="turnstile-slot"><div ref={container} /><small>Protected by Cloudflare Turnstile</small></div>;
}
