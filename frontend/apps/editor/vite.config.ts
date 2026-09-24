import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { federation } from "@module-federation/vite"

export default defineConfig({
  base: process.env.EDITOR_BASE ?? "/",
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "editor",
      filename: "remoteEntry.js",
      manifest: true,
      exposes: {
        "./Editor": "./src/Editor.tsx",
      },
      shared: {
        react: { singleton: true },
        "react-dom": { singleton: true },
      },
    }),
  ],
  server: { port: 5174, strictPort: true, origin: "http://localhost:5174", cors: true },
  preview: { port: 5174, strictPort: true, cors: true },
  build: { target: "esnext" },
})
