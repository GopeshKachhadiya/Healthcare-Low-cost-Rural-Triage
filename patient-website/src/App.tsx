import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import { AppContextProvider } from "./context/AppContext";
import { routesConfig } from "./routes";
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
            {routesConfig.map((route, index) => (
              <Route key={index} path={route.path} element={route.element} />
            ))}
          </Route>
        </Routes>
      </BrowserRouter>
    </AppContextProvider>
  );
}


