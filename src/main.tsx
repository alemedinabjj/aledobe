import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.tsx"
import { AreasProvider } from "./contexts/AreasContext.tsx"

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AreasProvider>
      <App />
    </AreasProvider>
  </React.StrictMode>,
)
