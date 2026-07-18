import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { AppContextProvider } from "./context/AppContext";
import { publicRoutes, patientRoutes, staffRoutes } from "./routes";
import { getLenis } from "./utils/lenis";

export default function App() {
  useEffect(() => {
    // Initialize Lenis globally for the entire website
    getLenis();
  }, []);

  return (
    <AppContextProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>

            {/* ── Public routes ─────────────────────────────────────────
                Accessible without any session (Landing, Login).          */}
            {publicRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}

            {/* ── Patient routes ────────────────────────────────────────
                Require any authenticated session.
                Unauthenticated users → /login (with return-to state).   */}
            {patientRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <ProtectedRoute requireAuth>
                    {route.element}
                  </ProtectedRoute>
                }
              />
            ))}

            {/* ── Staff / hospital routes ───────────────────────────────
                Require role: doctor | nurse | admin.
                Authenticated patients → /home.
                Unauthenticated users → /login.                          */}
            {staffRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <ProtectedRoute requireRole={["doctor", "nurse", "admin"]}>
                    {route.element}
                  </ProtectedRoute>
                }
              />
            ))}

          </Route>
        </Routes>
      </BrowserRouter>
    </AppContextProvider>
  );
}
