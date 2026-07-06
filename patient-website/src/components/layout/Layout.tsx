import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import { useSession } from "../../hooks/useSession";

export default function Layout() {
  const location = useLocation();
  const { isLoggedIn } = useSession();

  const isLandingPage = location.pathname === "/";

  return (
    <div className="flex min-h-screen flex-col">
      {!isLandingPage && <Navbar />}
      <main className="flex-1">
        <Outlet />
      </main>
      {!isLandingPage && <Footer />}
    </div>
  );
}
