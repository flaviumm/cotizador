import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Splash: ya montó React; se deja ver 1s y sale con fade (CSS en index.html).
const splash = document.getElementById("splash");
if (splash) {
  setTimeout(() => {
    splash.classList.add("splash-exit");
    setTimeout(() => splash.remove(), 500);
  }, 1000);
}
