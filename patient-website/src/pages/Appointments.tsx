import { useState } from "react";
import { Appointment } from "../context/AppContext";
import { Link } from "react-router-dom";
import TierBadge from "../components/TierBadge";
import PulseDivider from "../components/PulseDivider";
import { Calendar, PlusCircle, ArrowRight, ArrowLeft, Video, AlertTriangle } from "lucide-react";
import { useAppointments } from "../hooks/useAppointments";

export default function Appointments() {
  const { appointments, activeAppointments, pastAppointments, bookNewAppointment, isBooking } = useAppointments();
  const [activeTab, setActiveTab] = useState<"active" | "past">("active");

  const displayApts = activeTab === "active" ? activeAppointments : pastAppointments;

  const handleBook = async () => {
    await bookNewAppointment(
      "Dr. Alok Sharma (PHC Medical Officer)",
      "Chandpur Primary Health Centre",
      "green",
      "General wellness checkup and seasonal allergy consult."
    );
  };

  const getStatusStyle = (status: Appointment["status"]) => {
    switch (status) {
      case "pending":
        return "bg-marigold-50 text-marigold-600 border-marigold-200/50";
      case "accepted":
        return "bg-teal-50 text-teal-700 border-teal-200/50";
      case "in_consultation":
        return "bg-teal-505 text-white border-teal-505 animate-pulse";
      case "completed":
        return "bg-tier-green-bg text-tier-green border-tier-green/20";
      case "cancelled":
        return "bg-tier-red-bg text-tier-red border-tier-red/20";
      default:
        return "bg-ink/5 text-ink/60 border-ink/10";
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/home"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink/10 bg-white text-ink hover:border-teal-400 hover:text-teal-600 transition-all shadow-sm shrink-0"
            aria-label="Back to Home"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-3xl font-bold text-teal-700">My Appointments</h1>
            <p className="text-sm text-ink/60">Track referral consultations and schedule routine clinic visits</p>
          </div>
        </div>
        <button
          onClick={handleBook}
          disabled={isBooking}
          className="flex min-h-touch items-center justify-center gap-1.5 rounded-lg bg-teal-500 px-5 text-sm font-semibold text-white hover:bg-teal-600 transition-all shadow-md shadow-teal-500/10 disabled:opacity-50 shrink-0"
        >
          <PlusCircle className="h-4 w-4" />
          {isBooking ? "Scheduling..." : "Book Consultation"}
        </button>
      </div>


      <PulseDivider className="my-6 opacity-30" />

      {/* Tabs Selector */}
      <div className="flex border-b border-ink/10 mb-6">
        <button
          onClick={() => setActiveTab("active")}
          className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "active"
              ? "border-teal-500 text-teal-700"
              : "border-transparent text-ink/50 hover:text-ink/70"
          }`}
        >
          Active Consultations ({activeAppointments.length})
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "past"
              ? "border-teal-500 text-teal-700"
              : "border-transparent text-ink/50 hover:text-ink/70"
          }`}
        >
          Completed & Past ({pastAppointments.length})
        </button>
      </div>

      {/* Appointments List */}
      {displayApts.length === 0 ? (
        <div className="rounded-xl border border-ink/10 bg-white p-8 text-center space-y-4">
          <Calendar className="mx-auto h-12 w-12 text-teal-500/50" />
          <h2 className="font-display text-lg font-bold text-teal-700">No Appointments</h2>
          <p className="text-sm text-ink/60 max-w-sm mx-auto">
            You do not have any {activeTab} appointments scheduled. Click "Book Consultation" to set up a new visit.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayApts.map((apt) => (
            <div
              key={apt.id}
              className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm space-y-4 hover:border-teal-400 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusStyle(apt.status)}`}>
                      {apt.status.replace("_", " ").toUpperCase()}
                    </span>
                    {apt.status === "in_consultation" && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-tier-red">
                        <Video className="h-3.5 w-3.5 animate-bounce" /> Live
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-ink text-base mt-2">{apt.doctorName}</h3>
                  <p className="text-xs text-ink/50">{apt.facilityName}</p>
                </div>
                <TierBadge tier={apt.priority} size="sm" />
              </div>

              <div className="flex flex-wrap items-center justify-between border-t border-ink/5 pt-4 gap-4 text-xs font-semibold text-ink/70">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-ink/40 uppercase block">Date</span>
                    <span>{new Date(apt.date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-ink/40 uppercase block">Time Slot</span>
                    <span>{apt.time}</span>
                  </div>
                </div>

                <Link
                  to={`/appointments/${apt.id}`}
                  className="flex min-h-touch items-center gap-1 rounded-lg bg-teal-50 px-4 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
                >
                  Track Visit
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Escalation Notice */}
      <div className="mt-8 flex gap-3 rounded-xl bg-tier-orange-bg/70 p-4 border border-tier-orange/10 text-xs text-tier-orange">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p className="leading-normal">
          <strong>Escalation Triage:</strong> Scans categorized as Orange or Red are auto-escalated to doctor dashboards. These do not require manual scheduling and will show as "Accepted" once the Medical Officer confirms the queue triage.
        </p>
      </div>
    </div>
  );
}
