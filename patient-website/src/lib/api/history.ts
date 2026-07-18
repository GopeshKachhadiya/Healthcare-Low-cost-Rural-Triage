import { supabase } from "../supabaseClient";

export interface HealthHistoryEntry {
  id: string;
  type: "chat_session" | "vitals" | "symptom_log" | "scan" | "appointment";
  summary: string;
  timestamp: string;
  payload?: Record<string, any>;
}

/**
 * Fetches a unified health timeline for a patient by combining:
 *  - chat_sessions (triage conversations)
 *  - agent_insights (SBAR notes, care advice, patient profiles)
 *  - patient_vitals
 *  - symptom_logs
 *
 * Falls back to an empty array if Supabase is not configured or unreachable.
 */
export async function fetchHealthHistory(userId: string): Promise<HealthHistoryEntry[]> {
  try {
    const results: HealthHistoryEntry[] = [];

    // 1. Chat sessions
    const { data: sessions, error: sessionsErr } = await supabase
      .from("chat_sessions")
      .select("id, triage_tier, sbar_report, created_at, status")
      .eq("patient_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!sessionsErr && sessions) {
      sessions.forEach((s) => {
        results.push({
          id: s.id,
          type: "chat_session",
          summary: `Triage session — tier: ${s.triage_tier ?? "unknown"} | ${s.status ?? ""}`,
          timestamp: s.created_at,
          payload: { sbar_report: s.sbar_report, triage_tier: s.triage_tier },
        });
      });
    } else if (sessionsErr) {
      console.error("[history] chat_sessions fetch error:", sessionsErr.message);
    }

    // 2. Vitals logs
    const { data: vitals, error: vitalsErr } = await supabase
      .from("patient_vitals")
      .select("id, heart_rate, systolic_bp, diastolic_bp, temperature_c, oxygen_saturation, logged_at")
      .eq("patient_id", userId)
      .order("logged_at", { ascending: false })
      .limit(20);

    if (!vitalsErr && vitals) {
      vitals.forEach((v) => {
        results.push({
          id: v.id,
          type: "vitals",
          summary: `Vitals — HR: ${v.heart_rate} bpm | BP: ${v.systolic_bp}/${v.diastolic_bp} | SpO₂: ${v.oxygen_saturation}%`,
          timestamp: v.logged_at,
          payload: v,
        });
      });
    } else if (vitalsErr) {
      console.error("[history] patient_vitals fetch error:", vitalsErr.message);
    }

    // 3. Symptom logs
    const { data: symptoms, error: symptomsErr } = await supabase
      .from("symptom_logs")
      .select("id, symptoms, duration_days, severity, logged_at")
      .eq("patient_id", userId)
      .order("logged_at", { ascending: false })
      .limit(20);

    if (!symptomsErr && symptoms) {
      symptoms.forEach((s) => {
        results.push({
          id: s.id,
          type: "symptom_log",
          summary: `Symptoms — ${s.symptoms} | severity: ${s.severity} | duration: ${s.duration_days}d`,
          timestamp: s.logged_at,
          payload: s,
        });
      });
    } else if (symptomsErr) {
      console.error("[history] symptom_logs fetch error:", symptomsErr.message);
    }

    // Sort all entries together by timestamp descending
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return results;
  } catch (err: any) {
    console.error("[history] Unexpected error:", err);
    return [];
  }
}
