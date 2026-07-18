import type { ReactNode } from "react";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Upload from "./pages/Upload";
import ComingSoon from "./pages/ComingSoon";
import ScreeningResult from "./pages/ScreeningResult";
import Chat from "./pages/Chat";
import History from "./pages/History";
import Appointments from "./pages/Appointments";
import AppointmentDetail from "./pages/AppointmentDetail";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import HospitalDashboard from "./pages/hospital/HospitalDashboard";
import HospitalImaging from "./pages/hospital/HospitalImaging";
import PeriodHealthChat from "./pages/PeriodHealthChat";
import FindHospital from "./pages/FindHospital";

export interface RouteItem {
  path: string;
  element: ReactNode;
}

/** Public routes — accessible without any session */
export const publicRoutes: RouteItem[] = [
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
];

/**
 * Patient routes — require any authenticated session.
 * A user who is not logged in is redirected to /login.
 */
export const patientRoutes: RouteItem[] = [
  { path: "/home", element: <Home /> },
  { path: "/scan", element: <Upload /> },
  { path: "/scan/result/:id", element: <ScreeningResult /> },
  { path: "/chat", element: <Chat /> },
  { path: "/history", element: <History /> },
  { path: "/appointments", element: <Appointments /> },
  { path: "/appointments/:id", element: <AppointmentDetail /> },
  { path: "/profile", element: <Profile /> },
  { path: "/period-health", element: <PeriodHealthChat /> },
  { path: "/find-hospital", element: <FindHospital /> },
  { path: "/coming-soon", element: <ComingSoon /> },
];

/**
 * Hospital / staff routes — require role doctor | nurse | admin.
 * Authenticated patients are redirected to /home.
 * Unauthenticated users are redirected to /login.
 */
export const staffRoutes: RouteItem[] = [
  { path: "/hospital", element: <HospitalDashboard /> },
  { path: "/hospital/imaging", element: <HospitalImaging /> },
];
