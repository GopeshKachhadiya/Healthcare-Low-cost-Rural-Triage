import React from "react";
import { useParams, Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import TierBadge from "../components/TierBadge";
import PulseDivider from "../components/PulseDivider";
import { ShieldCheck, Calendar, ArrowLeft, BookOpen, AlertTriangle, FileText, MessageCircle } from "lucide-react";
import GradCamOverlay from "../components/GradCamOverlay";
import ScanResultChatPanel from "../components/ScanResultChatPanel";

export default function ScreeningResult() {
  const { id } = useParams<{ id: string }>();
  const { scans, appointments } = useApp();

  const scan = scans.find((s) => s.id === id);

  if (!scan) {
    return (
      <div className="mx-auto max-w-md px-5 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-tier-red">Scan Not Found</h1>
        <p className="mt-2 text-ink/60">We couldn't retrieve the specified diagnostic screening record.</p>
        <Link
          to="/scan"
          className="mt-6 inline-flex min-h-touch items-center justify-center px-6 rounded-lg bg-teal-500 font-semibold text-white hover:bg-teal-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Scan a condition
        </Link>
      </div>
    );
  }

  // Find if an auto-generated appointment exists for this scan condition
  const linkedAppointment = appointments.find((apt) =>
    apt.reason.includes(scan.condition) || (scan.tier === "red" && apt.priority === "red")
  );

  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-6">
        <Link to="/scan" className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Scanning
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-teal-700">AI Screening Result</h1>
            <p className="text-xs text-ink/50 mt-1">
              Performed on {new Date(scan.recordedAt).toLocaleString()} · ID: {scan.id}
            </p>
          </div>
          <TierBadge tier={scan.tier} />
        </div>
      </div>

      <PulseDivider className="mb-8 opacity-30" />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-12 items-start">
        {/* Left Column: Visual assessment with heatmap overlay slider */}
        <div className="md:col-span-4 space-y-6">
          <GradCamOverlay image={scan.image} heatmap={scan.heatmap} />


          {/* Metrics card */}
          <div className="rounded-xl border border-ink/10 bg-white p-5 shadow-sm space-y-4">
            <div>
              <span className="text-xs font-semibold text-ink/40 uppercase">Top Match Condition</span>
              <h4 className="font-semibold text-ink text-lg mt-0.5 leading-snug">{scan.condition}</h4>
            </div>
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-ink/60 mb-1.5">
                <span>AI Prediction Confidence</span>
                <span>{Math.round(scan.confidence * 100)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-teal-50 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    scan.tier === "red"
                      ? "bg-tier-red"
                      : scan.tier === "orange"
                      ? "bg-tier-orange"
                      : scan.tier === "yellow"
                      ? "bg-tier-yellow"
                      : "bg-tier-green"
                  }`}

                  style={{ width: `${scan.confidence * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: RAG grounded description & recommendations */}
        <div className="md:col-span-5 space-y-6">
          {/* AI Diagnostic Summary */}
          {scan.summary && (
            <div className="rounded-xl border border-teal-500/20 bg-teal-50/10 p-6 shadow-sm space-y-4">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold text-teal-700">
                <ShieldCheck className="h-5 w-5 text-teal-600" />
                AI Diagnostic Summary
              </h3>
              <p className="text-sm text-ink/80 leading-relaxed font-semibold">{scan.summary}</p>
            </div>
          )}

          {/* Grounded Description */}
          <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm space-y-4">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-teal-700">
              <BookOpen className="h-5 w-5" />
              Condition Information
            </h3>
            <p className="text-sm text-ink/80 leading-relaxed">{scan.explanation}</p>
            <div className="flex items-center gap-1.5 rounded bg-teal-50/50 p-2 text-[10px] font-mono text-teal-700 border border-teal-500/10">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
              <span>Grounded reference: [WHO Integrated Child Care Guidelines v2024, Ch 3]</span>
            </div>
          </div>

          {/* Action guidance */}
          <div className="rounded-xl border border-ink/10 bg-white p-6 shadow-sm space-y-4">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-teal-700">
              <FileText className="h-5 w-5" />
              Care Recommendation
            </h3>
            <p className="text-sm text-ink/80 leading-relaxed">{scan.recommendation}</p>
          </div>



          {/* Dynamic Referral/Appointment widget */}
          {scan.tier === "red" || scan.tier === "orange" ? (
            <div className="rounded-xl border border-tier-orange/20 bg-tier-orange-bg p-5 space-y-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-tier-orange mt-0.5" />
                <div className="leading-tight">
                  <h4 className="font-semibold text-tier-orange">Urgent Referral Triggered</h4>
                  <p className="text-xs text-ink/70 mt-1">
                    Due to triage priority score ({scan.tier.toUpperCase()}), this case has been forwarded to on-call doctors via SMS notification.
                  </p>
                </div>
              </div>

              {linkedAppointment ? (
                <div className="rounded-lg bg-white/70 p-4 border border-tier-orange/10 flex items-center justify-between flex-wrap gap-4">
                  <div className="leading-tight">
                    <span className="text-[10px] font-semibold text-ink/40 uppercase">Assigned Facility</span>
                    <p className="font-semibold text-ink text-sm mt-0.5">{linkedAppointment.doctorName}</p>
                    <p className="text-xs text-ink/60 mt-0.5">{linkedAppointment.facilityName}</p>
                  </div>
                  <Link
                    to={`/appointments/${linkedAppointment.id}`}
                    className="flex min-h-touch items-center gap-1.5 rounded-lg bg-teal-500 px-4 text-xs font-semibold text-white shadow hover:bg-teal-600 transition-colors"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Track Appointment
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-ink/50 italic">Compiling referral facility schedule...</p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-ink/10 bg-teal-50/30 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="leading-tight">
                <h4 className="font-semibold text-teal-700 text-sm">Need a second opinion?</h4>
                <p className="text-xs text-ink/50 mt-0.5">You can book a routine review consultation at your local PHC.</p>
              </div>
              <Link
                to="/appointments"
                className="flex min-h-touch items-center gap-1.5 rounded-lg bg-teal-500 px-5 text-sm font-semibold text-white hover:bg-teal-600 transition-colors"
              >
                Book consultation
              </Link>
            </div>
          )}
        </div>


        {/* Right Column: Chat Panel */}
        <div className="md:col-span-3 h-[calc(100vh-100px)] sticky top-6 rounded-xl overflow-hidden shadow-sm border border-ink/10 bg-white">
          <ScanResultChatPanel condition={scan.condition} summary={scan.summary || scan.explanation} />
        </div>
      </div>
    </div>
  );
}
