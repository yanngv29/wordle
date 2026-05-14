/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { createRoot } from "react-dom/client";
import { App } from "./App";

type Language = "fr" | "en";

function getLanguageFromWindow(): Language {
  const lang = (window as any).APP_LANGUAGE;
  return (lang === "en" ? "en" : "fr") as Language;
}

function start() {
  const language = getLanguageFromWindow();
  const root = createRoot(document.getElementById("root")!);
  root.render(<App language={language} />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
