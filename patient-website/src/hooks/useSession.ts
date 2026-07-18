import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

/**
 * useSession — session-aware wrapper over AppContext.
 *
 * Provides all AppContext auth helpers plus a navigation-aware `logout()`
 * that uses React Router's `useNavigate` so the SPA never does a hard
 * page reload (window.location.href).
 *
 * Call site (Profile.tsx, Navbar.tsx):
 *   const { logout } = useSession();
 *   <button onClick={logout}>Log out</button>
 */
export function useSession() {
  const { user, consent, login, logout: ctxLogout, updateProfile, updateConsent } = useApp();
  const navigate = useNavigate();

  /** Clears session state and navigates to the landing page via React Router. */
  const logout = () => {
    ctxLogout();          // clears localStorage + sets user → null
    navigate("/", { replace: true });   // SPA navigation — no full reload
  };

  return {
    user,
    consent,
    login,
    logout,
    updateProfile,
    updateConsent,
    isLoggedIn: !!user,
  };
}
