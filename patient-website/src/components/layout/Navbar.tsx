import { Link, NavLink } from "react-router-dom";
import { Globe, LogOut, Activity, LayoutDashboard, Users, Map } from "lucide-react";
import { useSession } from "../../hooks/useSession";

const PATIENT_LINKS = [
  { to: "/chat", label: "Ask" },
  { to: "/history", label: "History" },
  { to: "/find-hospital", label: "Find a hospital" },
];

const STAFF_LINKS = [
  { to: "/hospital", label: "Triage Queue", icon: LayoutDashboard },
  { to: "/hospital?tab=patients", label: "Patients", icon: Users },
  { to: "/hospital?tab=map", label: "Disease Map", icon: Map },
];

export default function Navbar() {
  const { user, logout } = useSession();
  
  const isStaff = user?.role && user.role !== "patient";

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3">
        <Link to={isStaff ? "/hospital" : "/"} className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 font-display text-lg text-white">
            {isStaff ? <Activity className="h-5 w-5" /> : "अ"}
          </span>
          <span className="font-display text-xl font-semibold text-teal-700">
            {isStaff ? "Hospital Panel" : "ArogyaMitra"}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          {!isStaff && PATIENT_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? "text-teal-600" : "text-ink/70 hover:text-teal-600"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          
          {isStaff && STAFF_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  isActive ? "text-teal-600" : "text-ink/70 hover:text-teal-600"
                }`
              }
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {!isStaff && (
            <button
              className="flex min-h-touch items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-ink/70 hover:text-teal-600"
              aria-label="Change language"
            >
              <Globe className="h-5 w-5" />
              <span className="hidden sm:inline">हिन्दी</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-4 border-l border-ink/10 pl-4">
              <div className="hidden text-right md:block">
                <p className="text-sm font-bold text-ink">{user.name}</p>
                {isStaff && <p className="text-[10px] font-medium text-ink/60 capitalize">{user.role}</p>}
              </div>
              <Link
                to={isStaff ? "/hospital" : "/profile"}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-700"
              >
                {user.name.charAt(0)}
              </Link>
              <button onClick={() => logout()} className="text-ink/50 hover:text-ink">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-sm font-bold text-teal-600 hover:text-teal-700">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
