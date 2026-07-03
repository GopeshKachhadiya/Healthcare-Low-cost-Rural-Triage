import { useApp } from "../context/AppContext";
import { Link } from "react-router-dom";
import TierBadge from "../components/TierBadge";
import PulseDivider from "../components/PulseDivider";
import { Calendar, Camera, MessageCircle, FileText, ArrowRight, ArrowLeft, UserPlus, Clock } from "lucide-react";

interface TimelineItem {
  type: "scan" | "appointment" | "chat";
  id: string;
  title: string;
  meta: string;
  date: Date;
  tier: "green" | "yellow" | "orange" | "red";
  link: string;
  prescription?: {
    medicines: { name: string; dosage: string; frequency: string; duration: string }[];
    notes: string;
  };
}

export default function History() {
  const { scans, appointments, chatHistory } = useApp();

  // Combine items into a single timeline array
  const timelineItems: TimelineItem[] = [
    ...scans.map((s) => ({
      type: "scan" as const,
      id: s.id,
      title: `Skin Screening: ${s.condition}`,
      meta: `${Math.round(s.confidence * 100)}% Confidence`,
      date: new Date(s.recordedAt),
      tier: s.tier,
      link: `/scan/result/${s.id}`,
    })),
    ...appointments.map((a) => ({
      type: "appointment" as const,
      id: a.id,
      title: `Consultation: ${a.doctorName}`,
      meta: `${a.facilityName} · Status: ${a.status.toUpperCase()}`,
      date: new Date(a.date),
      tier: a.priority,
      link: `/appointments/${a.id}`,
      prescription: a.prescription,
    })),
    ...(chatHistory.length > 0
      ? [
          {
            type: "chat" as const,
            id: "chat-log",
            title: `ArogyaMitra Chat Session`,
            meta: `${chatHistory.length} messages exchanged`,
            date: new Date(),
            tier: (chatHistory.some((m) => m.isRedFlag) ? "red" : "green") as any,
            link: "/chat",
          },
        ]
      : [])
  ].sort((a, b) => b.date.getTime() - a.date.getTime());


  const getIcon = (type: "scan" | "appointment" | "chat") => {
    switch (type) {
      case "scan":
        return <Camera className="h-5 w-5 text-teal-600" />;
      case "appointment":
        return <Calendar className="h-5 w-5 text-teal-600" />;
      case "chat":
        return <MessageCircle className="h-5 w-5 text-teal-600" />;
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-ink/10 bg-white text-ink hover:border-teal-400 hover:text-teal-600 transition-all shadow-sm shrink-0"
          aria-label="Back to Home"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-3xl font-bold text-teal-700">My Health History</h1>
          <p className="text-sm text-ink/60">Longitudinal timeline of your visits, prescriptions, and scans</p>
        </div>
      </div>


      <PulseDivider className="my-6 opacity-30" />

      {timelineItems.length === 0 ? (
        <div className="rounded-xl border border-ink/10 bg-white p-8 text-center space-y-4">
          <Clock className="mx-auto h-12 w-12 text-teal-500/50" />
          <h2 className="font-display text-lg font-bold text-teal-700">No Records Found</h2>
          <p className="text-sm text-ink/60 max-w-md mx-auto">
            You haven't recorded any scans, queries, or appointments yet. Check back here after using the chatbot or scan tool.
          </p>
        </div>
      ) : (
        <div className="relative border-l-2 border-teal-500/20 pl-6 ml-4 space-y-8">
          {timelineItems.map((item, idx) => (
            <div key={`${item.type}-${item.id}-${idx}`} className="relative">
              {/* Dot Icon */}
              <span className="absolute -left-[38px] top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 border-2 border-teal-500 shadow-sm">
                {getIcon(item.type)}
              </span>

              {/* Record Card */}
              <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm space-y-4 hover:border-teal-400 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-ink/40 uppercase tracking-wider block">
                      {item.type.toUpperCase()} · {item.date.toLocaleDateString()}
                    </span>
                    <h3 className="font-semibold text-ink text-base mt-0.5">{item.title}</h3>
                    <p className="text-xs text-ink/50 mt-0.5">{item.meta}</p>
                  </div>
                  <TierBadge tier={item.tier} size="sm" />
                </div>

                {/* Optional Prescription Preview */}
                {item.prescription && (
                  <div className="rounded-lg bg-teal-50/30 p-3.5 border border-teal-500/5 space-y-2">
                    <h4 className="flex items-center gap-1.5 text-xs font-bold text-teal-700">
                      <FileText className="h-4 w-4" />
                      Prescription Issued:
                    </h4>
                    <ul className="text-xs text-ink/70 space-y-1.5 list-disc pl-4">
                      {item.prescription.medicines.map((m, mIdx) => (
                        <li key={mIdx}>
                          <strong>{m.name}</strong> - {m.dosage} ({m.frequency}, {m.duration})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-end pt-1">
                  <Link
                    to={item.link}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 hover:underline"
                  >
                    View Details
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ABDM Interop Notice */}
      <div className="mt-12 rounded-xl bg-teal-50/40 p-5 border border-teal-500/10 flex gap-3 text-xs text-teal-700">
        <UserPlus className="h-5 w-5 shrink-0 text-teal-500 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-bold">Ayushman Bharat Digital Health Integration</p>
          <p className="text-ink/60 mt-1">
            This timeline integrates with the ABDM Health Information Exchange. You can link your ABHA ID inside settings to download external diagnostic records and prescriptions from central health facilities.
          </p>
        </div>
      </div>
    </div>
  );
}
