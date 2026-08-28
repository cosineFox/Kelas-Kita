import { Component, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ModerationDashboard from "./components/ModerationDashboard";
import "./styles.css";

class PageErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error: error instanceof Error ? error.message : "Unknown rendering error" };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="moderation-login">
        <section className="route-error" role="alert">
          <strong>This page crashed.</strong>
          <p>{this.state.error}</p>
          <button className="button primary" onClick={() => window.location.reload()}>Reload</button>
          <a href="/">Back to the public site</a>
        </section>
      </main>
    );
  }
}

const RootPage = window.location.pathname.replace(/\/$/, "") === "/moderation"
  ? ModerationDashboard
  : App;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PageErrorBoundary>
      <RootPage />
    </PageErrorBoundary>
  </StrictMode>,
);
