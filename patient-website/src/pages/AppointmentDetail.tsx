import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useApp, Appointment } from "../context/AppContext";
import TierBadge from "../components/TierBadge";
import PulseDivider from "../components/PulseDivider";
import { ArrowLeft, Phone, Video, CheckCircle, FileText, Volume2, ShieldAlert } from "lucide-react";

export default function AppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const { appointments, updateAppointmentStatus } = useApp();

  const apt = appointments.find((a) => a.id === id);
  const [playingMedIdx, setPlayingMedIdx] = useState<number | null>(null);

  if (!apt) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-tier-red">Record Not Found</h1>
        <p className="mt-2 text-ink/60">We couldn't retrieve the specified appointment record.</p>
        <Link
          to="/appointments"
          className="mt-6 inline-flex min-h-touch items-center justify-center px-6 rounded-lg bg-teal-500 font-semibold text-white hover:bg-teal-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          My appointments
        </Link>
      </div>
    );
  }

  const handleStartConsult = () => {
    updateAppointmentStatus(apt.id, "in_consultation");
  };

  const handleEndConsult = () => {
    // Add a mock prescription upon completing the consult
    const updatedApts = [...appointments];
    const targetIdx = updatedApts.findIndex((a) => a.id === apt.id);
    if (targetIdx !== -1) {
      updatedApts[targetIdx] = {
        ...updatedApts[targetIdx],
        status: "completed",
        prescription: {
          medicines: [
            { name: "Amoxicillin 500mg", dosage: "1 Capsule", frequency: "Thrice daily", duration: "5 Days" },
            { name: "Paracetamol 650mg", dosage: "1 Tablet", frequency: "As needed (Fever)", duration: "3 Days" }
          ],
          notes: "Drink warm liquids. Rest for 2 days. Return to clinic if fever does not settle."
        }
      };
      // Write back to state
      localStorage.setItem("am_appointments", JSON.stringify(updatedApts));
      // Trigger context reload via changing status (will trigger component update)
      updateAppointmentStatus(apt.id, "completed");
    }
  };

  const handlePlayTTS = (idx: number, name: string, dosage: string, frequency: string, duration: string) => {
    setPlayingMedIdx(idx);
    // Simulate TTS speech
    setTimeout(() => {
      setPlayingMedIdx(null);
    }, 4500);
  };

  const getStepStatus = (step: number) => {
    const statuses = ["pending", "accepted", "in_consultation", "completed"];
    const currentIdx = statuses.indexOf(apt.status);
    if (currentIdx >= step) return "active";
    return "inactive";
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-6">
        <Link to="/appointments" className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Appointments
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-teal-700">Appointment Tracker</h1>
            <p className="text-xs text-ink/50 mt-1">ID: {apt.id}</p>
          </div>
          <TierBadge tier={apt.priority} />
        </div>
      </div>

      <PulseDivider className="mb-8 opacity-30" />

      {/* Progress tracker timeline */}
      <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm mb-6">
        <h3 className="font-semibold text-ink text-sm mb-4">Consultation Progress</h3>
        <div className="grid grid-cols-4 gap-2 text-center text-xs relative">
          {[
            { label: "1. Raised / Triage Checked", code: "pending" },
            { label: "2. Confirmed / Scheduled", code: "accepted" },
            { label: "3. Live Consultation", code: "in_consultation" },
            { label: "4. Visit Completed", code: "completed" }
          ].map((s, idx) => {
            const status = getStepStatus(idx);
            return (
              <div key={idx} className="space-y-2 flex flex-col items-center">
                <span className={`h-8 w-8 flex items-center justify-center rounded-full font-bold text-sm transition-all border ${
                  status === "active"
                    ? "bg-teal-500 text-white border-teal-500 shadow-md shadow-teal-500/20"
                    : "bg-paper text-ink/30 border-ink/10"
                }`}>
                  {idx + 1}
                </span>
                <span className={`font-semibold ${status === "active" ? "text-teal-700" : "text-ink/40"}`}>
                  {s.label.split(". ")[1]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Left main details */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm space-y-4">
            <div>
              <span className="text-[10px] font-bold text-ink/40 uppercase tracking-wider block">Assigned Doctor</span>
              <h3 className="font-semibold text-ink text-lg mt-0.5">{apt.doctorName}</h3>
              <p className="text-sm text-ink/60">{apt.facilityName}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-ink/40 uppercase tracking-wider block">Reason for Visit</span>
              <p className="text-sm text-ink/80 leading-relaxed mt-1">{apt.reason}</p>
            </div>
          </div>

          {/* Electronic Prescription card (Only if completed) */}
          {apt.status === "completed" && (
            <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm space-y-5">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-teal-700">
                <FileText className="h-5 w-5" />
                Electronic Prescription / ई-पर्चा
              </h3>

              {apt.prescription ? (
                <div className="space-y-4">
                  <div className="divide-y divide-ink/5">
                    {apt.prescription.medicines.map((m, idx) => (
                      <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                        <div className="leading-tight">
                          <h4 className="font-semibold text-ink text-sm">{m.name}</h4>
                          <p className="text-xs text-ink/50 mt-1">
                            {m.dosage} · {m.frequency} · {m.duration}
                          </p>
                        </div>
                        <button
                          onClick={() => handlePlayTTS(idx, m.name, m.dosage, m.frequency, m.duration)}
                          className={`flex min-h-touch items-center gap-1.5 px-3 rounded-lg text-xs font-semibold ${
                            playingMedIdx === idx
                              ? "bg-teal-500 text-white"
                              : "bg-teal-50 text-teal-700 hover:bg-teal-100"
                          } transition-colors`}
                        >
                          <Volume2 className="h-4 w-4" />
                          {playingMedIdx === idx ? "सुन रहे हैं..." : "Listen / सुनें"}
                        </button>
                      </div>
                    ))}
                  </div>

                  {playingMedIdx !== null && (
                    <div className="rounded-lg bg-teal-50/50 p-3 text-xs text-teal-700 font-mono flex items-center gap-2 animate-pulse border border-teal-500/10">
                      <span className="flex h-2 w-2 rounded-full bg-teal-500" />
                      <span>
                        "दवाई की खुराक: {apt.prescription.medicines[playingMedIdx].name}, {apt.prescription.medicines[playingMedIdx].dosage}, {apt.prescription.medicines[playingMedIdx].frequency}, {apt.prescription.medicines[playingMedIdx].duration} तक लें।"
                      </span>
                    </div>
                  )}

                  <div className="rounded-lg bg-paper p-3 border border-ink/5 text-xs text-ink/75 leading-relaxed">
                    <strong>Doctor Notes:</strong> {apt.prescription.notes}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-ink/40 italic">Retrieving prescription details...</p>
              )}
            </div>
          )}
        </div>

        {/* Right consultation triggers */}
        <div className="space-y-6">
          <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm space-y-4">
            <h4 className="font-semibold text-ink text-sm">Appointment Timing</h4>
            <div className="text-xs leading-normal space-y-2 text-ink/70">
              <p>
                <strong>Date:</strong> {new Date(apt.date).toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
              <p>
                <strong>Time Slot:</strong> {apt.time}
              </p>
            </div>
          </div>

          {/* Interactive Live Consult Controls */}
          {apt.status === "accepted" && (
            <div className="rounded-xl border border-teal-500/20 bg-teal-50/30 p-5 space-y-4">
              <h4 className="font-semibold text-teal-700 text-sm">Consultation is Ready</h4>
              <p className="text-xs text-ink/60">
                You can start your live consultation with Dr. Sharma now. Click the button to initiate video call.
              </p>
              <button
                onClick={handleStartConsult}
                className="flex w-full min-h-touch items-center justify-center gap-2 rounded-lg bg-teal-500 font-semibold text-white shadow-md shadow-teal-500/15 hover:bg-teal-600 transition-colors"
              >
                <Video className="h-5 w-5" />
                Start Consult
              </button>
            </div>
          )}

          {apt.status === "in_consultation" && (
            <div className="rounded-xl border border-tier-red/20 bg-tier-red-bg p-5 space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-tier-red text-white animate-pulse">
                <Video className="h-6 w-6" />
              </div>
              <h4 className="font-semibold text-tier-red text-sm">Live Video Call Active</h4>
              <p className="text-xs text-ink/60">
                You are in consultation with Dr. Sharma. Once concluded, click the button to view your e-prescription.
              </p>
              <button
                onClick={handleEndConsult}
                className="flex w-full min-h-touch items-center justify-center gap-2 rounded-lg bg-tier-red font-semibold text-white hover:bg-tier-red/90 transition-colors"
              >
                <CheckCircle className="h-5 w-5" />
                End & Issue Prescription
              </button>
            </div>
          )}

          {/* Clinic Contact details */}
          {["pending", "accepted"].includes(apt.status) && (
            <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm space-y-3">
              <h4 className="font-semibold text-ink text-sm">PHC Contact Info</h4>
              <p className="text-xs text-ink/50">For inquiries or rescheduling requests, call the clinic directly.</p>
              <a
                href="tel:+918899002233"
                className="flex min-h-touch items-center justify-center gap-2 rounded-lg border border-ink/20 bg-paper font-semibold text-ink/80 hover:border-teal-400 transition-colors text-sm"
              >
                <Phone className="h-4 w-4" />
                Call PHC Operator
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
