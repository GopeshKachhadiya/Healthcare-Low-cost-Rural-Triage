import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Upload from "./pages/Upload";
import ScreeningResult from "./pages/ScreeningResult";
import Chat from "./pages/Chat";
import History from "./pages/History";
import Appointments from "./pages/Appointments";
import AppointmentDetail from "./pages/AppointmentDetail";
import HospitalMap from "./pages/HospitalMap";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import HospitalDashboard from "./pages/hospital/HospitalDashboard";
import HospitalImaging from "./pages/hospital/HospitalImaging";
import PeriodHealthChat from "./pages/PeriodHealthChat";

export interface RouteItem {
  path: string;
  element: React.ReactNode;
}

export const routesConfig: RouteItem[] = [
  { path: "/home", element: <Home /> },
  { path: "/", element: <Landing /> },
  { path: "/scan", element: <Upload /> },
  { path: "/scan/result/:id", element: <ScreeningResult /> },
  { path: "/chat", element: <Chat /> },
  { path: "/history", element: <History /> },
  { path: "/appointments", element: <Appointments /> },
  { path: "/appointments/:id", element: <AppointmentDetail /> },
  { path: "/find-hospital", element: <HospitalMap /> },
  { path: "/profile", element: <Profile /> },
  { path: "/login", element: <Login /> },
  { path: "/hospital", element: <HospitalDashboard /> },
  { path: "/hospital/imaging", element: <HospitalImaging /> },
  { path: "/period-health", element: <PeriodHealthChat /> },
];
