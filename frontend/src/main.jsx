import React from "react"
import { createRoot } from "react-dom/client"
import App from "./AppWithSidebar.jsx"
import { AppProvider } from "./contexts/AppContext.jsx"
import "./index.css"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-alpine.css"

createRoot(document.getElementById("root")).render(
  <AppProvider>
    <App />
  </AppProvider>
)