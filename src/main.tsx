import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// Leaflet CSS must be imported once
import "leaflet/dist/leaflet.css";
import "./leafletIconFix";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
