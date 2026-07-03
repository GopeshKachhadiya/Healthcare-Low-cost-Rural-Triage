import { Link, NavLink } from "react-router-dom";
import { Globe } from "lucide-react";

const NAV_LINKS = [
  { to: "/chat", label: "Ask" },
  { to: "/history", label: "History" },
  { to: "/find-hospital", label: "Find a hospital" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 font-display text-lg text-white">
            अ
          </span>
          <span className="font-display text-xl font-semibold text-teal-700">ArogyaMitra</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
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
        </nav>

        <div className="flex items-center gap-3">
          <button
            className="flex min-h-touch items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-ink/70 hover:text-teal-600"
            aria-label="Change language"
          >
            <Globe className="h-5 w-5" />
            <span className="hidden sm:inline">हिन्दी</span>
          </button>
          <Link
            to="/profile"
            className="flex min-h-touch min-w-touch items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-700"
          >
            RK
          </Link>
        </div>
      </div>
    </header>
  );
}
