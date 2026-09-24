import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { federation } from "@module-federation/vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const editorUrl = (env.VITE_EDITOR_URL || "http://localhost:5174").replace(/\/$/, "")
  return {
    plugins: [
      react(),
      tailwindcss(),
      federation({
        name: "shell",
        remotes: {
          editor: {
            type: "module",
            name: "editor",
            entry: `${editorUrl}/remoteEntry.js`,
            entryGlobalName: "editor",
            shareScope: "default",
          },
        },
        shared: {
          react: { singleton: true },
          "react-dom": { singleton: true },
        },
      }),
    ],
    server: { port: 5173, strictPort: true },
    preview: { port: 5173, strictPort: true },
    build: { target: "esnext" },
  }
})
