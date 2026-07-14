import { CheckCircle2, AlertCircle, AlertTriangle, Siren } from "lucide-react";

export type Tier = "green" | "yellow" | "orange" | "red";

const TIER_CONFIG: Record<
  Tier,
  { label: string; sub: string; icon: typeof CheckCircle2; text: string; bg: string; ring: string }
> = {
  green: {
    label: "Routine",
    sub: "Self-care guidance available",
    icon: CheckCircle2,
    text: "text-tier-green",
    bg: "bg-tier-green-bg",
    ring: "ring-tier-green/30",
  },
  yellow: {
    label: "Needs review",
    sub: "See a doctor within 24–48 hours",
    icon: AlertCircle,
    text: "text-tier-yellow",
    bg: "bg-tier-yellow-bg",
    ring: "ring-tier-yellow/40",
  },
  orange: {
    label: "Urgent",
    sub: "See a doctor today",
    icon: AlertTriangle,
    text: "text-tier-orange",
    bg: "bg-tier-orange-bg",
    ring: "ring-tier-orange/30",
  },
  red: {
    label: "Emergency",
    sub: "Seek immediate medical help",
    icon: Siren,
    text: "text-tier-red",
    bg: "bg-tier-red-bg",
    ring: "ring-tier-red/30",
  },
};

// Never relies on color alone — icon + text label always present,
// per patient.md §15.1 "Color + icon + text for tier".
export default function TierBadge({ tier, size = "md" }: { tier: Tier; size?: "sm" | "md" }) {
  const normalizedTier = (tier || "green").toLowerCase() as Tier;
  const cfg = TIER_CONFIG[normalizedTier] || TIER_CONFIG.green;
  const Icon = cfg.icon;
  const isCompact = size === "sm";

  return (
    <div
      role="status"
      className={`inline-flex items-center gap-2.5 rounded-xl ${cfg.bg} ring-1 ${cfg.ring} ${
        isCompact ? "px-3 py-1.5" : "px-4 py-3"
      }`}
    >
      <Icon className={`${cfg.text} ${isCompact ? "h-4 w-4" : "h-6 w-6"} shrink-0`} strokeWidth={2.25} />
      <div className="leading-tight">
        <p className={`font-semibold ${cfg.text} ${isCompact ? "text-sm" : "text-base"}`}>{cfg.label}</p>
        {!isCompact && <p className="text-xs text-ink/60">{cfg.sub}</p>}
      </div>
    </div>
  );
}
