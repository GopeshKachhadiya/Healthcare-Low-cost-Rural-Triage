import { useApp } from "../context/AppContext";

export function useSession() {
  const { user, consent, login, logout, updateProfile, updateConsent } = useApp();

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
