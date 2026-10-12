import React from "react";
import ReactDOM from "react-dom/client";
import Sidepanel from "./Sidepanel";
import "../styles/global.css";

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <Sidepanel />
    </React.StrictMode>
  );
}
