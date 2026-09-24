import { lazy, Suspense, useEffect, type ReactNode } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router"
import { Toaster, TooltipProvider } from "@aledobe/ui"
import { useSession } from "./lib/session"
import { EditorLoading } from "./components/EditorHost"
import Landing from "./pages/Landing"

const Login = lazy(() => import("./pages/Login"))
const Dashboard = lazy(() => import("./pages/Dashboard"))
const FilePage = lazy(() => import("./pages/FilePage"))
const Playground = lazy(() => import("./pages/Playground"))

function Protected({ children }: { children: ReactNode }) {
  const { ready, user } = useSession()
  if (!ready) return <EditorLoading label="Loading your workspace" />
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const init = useSession((s) => s.init)
  useEffect(() => {
    init()
  }, [init])
  return (
    <TooltipProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Suspense fallback={<EditorLoading label="Loading" />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/playground" element={<Playground />} />
            <Route
              path="/dashboard"
              element={
                <Protected>
                  <Dashboard />
                </Protected>
              }
            />
            <Route
              path="/dashboard/projects/:projectId"
              element={
                <Protected>
                  <Dashboard />
                </Protected>
              }
            />
            <Route
              path="/file/:fileId"
              element={
                <Protected>
                  <FilePage />
                </Protected>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </TooltipProvider>
  )
}
