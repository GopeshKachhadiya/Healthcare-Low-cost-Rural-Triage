import { Navigate, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * When true, any authenticated user may access this route.
   * Unauthenticated users are redirected to /login.
   */
  requireAuth?: boolean;
  /**
   * When provided, the user must have one of these roles to access the route.
   * Any other authenticated user is redirected to /home (patient) or /login (no session).
   * Example: requireRole={["doctor", "nurse", "admin"]} for hospital routes.
   */
  requireRole?: Array<"patient" | "doctor" | "nurse" | "admin">;
}

/**
 * ProtectedRoute — route-level authentication and authorisation guard.
 *
 * Usage in routes.tsx:
 *
 *   // Any logged-in user
 *   <ProtectedRoute requireAuth>
 *     <Chat />
 *   </ProtectedRoute>
 *
 *   // Hospital staff only
 *   <ProtectedRoute requireRole={["doctor", "nurse", "admin"]}>
 *     <HospitalDashboard />
 *   </ProtectedRoute>
 */
export default function ProtectedRoute({
  children,
  requireAuth = false,
  requireRole,
}: ProtectedRouteProps) {
  const { user } = useApp();
  const location = useLocation();

  // Not logged in at all → send to /login, preserving the intended destination
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based check (e.g. hospital routes require doctor/nurse/admin)
  if (requireRole && !requireRole.includes(user.role as any)) {
    // Authenticated patient trying to access staff-only route → redirect to /home
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}
