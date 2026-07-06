import { Link, Navigate } from "react-router-dom";
import { Mic, Camera, MessageCircle, Clock, MapPin, CalendarCheck, Heart } from "lucide-react";
import PulseDivider from "../components/PulseDivider";
import TierBadge from "../components/TierBadge";
import { useApp } from "../context/AppContext";
import { useTranslation } from "../hooks/useTranslation";

export default function Home() {
  const { scans, appointments, user } = useApp();
  const { t } = useTranslation();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const QUICK_ACTIONS = [
    {
      to: "/scan",
      icon: Camera,
      title: t("home.scan"),
      desc: "Photograph a skin, eye, or oral concern",
    },
    {
      to: "/chat",
      icon: MessageCircle,
      title: t("home.chat"),
      desc: "Get answers grounded in medical guidelines",
    },
    {
      to: "/find-hospital",
      icon: MapPin,
      title: t("home.findClinic"),
      desc: "Nearest facility for your condition",
    },
    {
      to: "/history",
      icon: Clock,
      title: t("home.history"),
      desc: "Past visits, screenings, prescriptions",
    },
    {
      to: "/appointments",
      icon: CalendarCheck,
      title: t("home.appointments"),
      desc: "Track a booked or raised visit",
    },
    {
      to: "/period-health",
      icon: Heart,
      title: "Period Health Bot",
      desc: "Menstrual health intake & triage assistant",
      highlight: true,
    },
  ];

  // Combine scans and appointments to get recent items
  const recentItems = [
    ...scans.map((s) => ({
      id: s.id,
      title: `Skin Screening — ${s.condition.split(" / ")[0]}`,
      meta: `Today · ${Math.round(s.confidence * 100)}% confidence`,
      tier: s.tier,
      to: `/scan/result/${s.id}`,
    })),
    ...appointments.map((a) => ({
      id: a.id,
      title: `Consultation — ${a.doctorName.split(" (")[0]}`,
      meta: `${new Date(a.date).toLocaleDateString()} · ${a.facilityName.split(" Primary")[0]}`,
      tier: a.priority,
      to: `/appointments/${a.id}`,
    })),
  ].slice(0, 3); // Get top 3 recent items

  return (
    <div>
      {/* ── Hero: voice is the largest, most prominent element ── */}
      <section className="mx-auto max-w-3xl px-5 pb-10 pt-14 text-center">
        <p className="font-display text-lg text-marigold-600">
          {t("home.welcome")}, {user.name}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight text-teal-700 sm:text-5xl">
          {t("home.subtitle")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-ink/70">
          Speak your symptoms, scan a photo, or ask a question — ArogyaMitra
          helps you understand what to do next, and connects you to a doctor
          when it matters.
        </p>

        <Link
          to="/chat"
          className="group mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-teal-500 text-white shadow-lg shadow-teal-500/30 transition-transform hover:scale-105 focus-visible:scale-105"
          aria-label="Speak your symptoms"
        >
          <Mic className="h-8 w-8" strokeWidth={2} />
        </Link>
        <p className="mt-3 text-sm font-medium text-teal-700">Tap to speak your symptoms</p>
      </section>

      <PulseDivider className="opacity-40" />

      {/* ── Quick actions — max 3 per row, per patient.md §15.1 ── */}
      <section className="mx-auto max-w-4xl px-5 py-12">
        <h2 className="mb-6 text-center font-display text-2xl font-semibold text-ink">
          {t("home.quickActions")}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map(({ to, icon: Icon, title, desc, highlight }: any) => (
            <Link
              key={to}
              to={to}
              className={`group flex min-h-touch flex-col gap-3 rounded-xl border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${highlight
                  ? "border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 hover:border-rose-400"
                  : "border-ink/10 bg-white hover:border-teal-400"
                }`}
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${highlight
                    ? "bg-rose-100 text-rose-500 group-hover:bg-rose-500 group-hover:text-white"
                    : "bg-teal-50 text-teal-600 group-hover:bg-teal-500 group-hover:text-white"
                  }`}
              >
                <Icon className="h-6 w-6" strokeWidth={2} />
              </span>
              <div>
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="mt-0.5 text-sm text-ink/60">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <PulseDivider className="opacity-40" />

      {/* ── Recent activity preview ── */}
      <section className="mx-auto max-w-3xl px-5 py-12">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-ink">Recent activity</h2>
          <Link to="/history" className="text-sm font-medium text-teal-600 hover:underline">
            View all
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {recentItems.length > 0 ? (
            recentItems.map((item) => (
              <Link
                key={item.id}
                to={item.to}
                className="flex items-center justify-between rounded-xl border border-ink/10 bg-white p-4 hover:border-teal-400 transition-colors"
              >
                <div>
                  <p className="font-medium text-ink">{item.title}</p>
                  <p className="text-sm text-ink/50">{item.meta}</p>
                </div>
                <TierBadge tier={item.tier} size="sm" />
              </Link>
            ))
          ) : (
            <p className="text-sm text-ink/50 text-center py-6">No recent clinical activity recorded.</p>
          )}
        </div>
      </section>
    </div>
  );
}

