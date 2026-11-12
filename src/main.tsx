// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

if (import.meta.env.DEV) {
  import("./dev/seedData").then(({ seedDatabase, clearDevData }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__seedDatabase = seedDatabase;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__clearDevData = clearDevData;
  });
}
