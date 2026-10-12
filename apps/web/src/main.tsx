import "./styles/globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/app";
import { appConfig } from "./config/app.config";

document.title = appConfig.name;

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element in index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
