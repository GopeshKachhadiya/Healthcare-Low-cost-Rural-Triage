import { ShieldAlert } from "lucide-react";

interface SafetyDisclaimerProps {
  className?: string;
  text?: string;
}

export default function SafetyDisclaimer({
  className = "",
  text = "This is an AI screening aid, not a medical diagnosis. Please consult a qualified healthcare professional for confirmation and treatment.",
}: SafetyDisclaimerProps) {
  return (
    <div
      role="note"
      className={`flex items-start gap-3 rounded-xl border border-marigold-200 bg-marigold-50/60 p-4 text-sm text-marigold-700 ${className}`}
    >
      <ShieldAlert className="h-5 w-5 shrink-0 text-marigold-500 mt-0.5" />
      <div className="leading-relaxed">
        <p className="font-semibold text-marigold-800">Medical Advice Disclaimer</p>
        <p className="mt-0.5 text-xs text-marigold-700/90">{text}</p>
      </div>
    </div>
  );
}
