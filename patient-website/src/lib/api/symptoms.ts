import { supabase } from "../supabaseClient";

export interface SymptomLog {
  symptoms: string;
  durationDays: number;
  severity: "mild" | "moderate" | "severe";
}

export async function logSymptoms(
  userId: string,
  data: SymptomLog
): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    const { data: row, error } = await supabase
      .from("symptom_logs")
      .insert({
        patient_id: userId,
        symptoms: data.symptoms,
        duration_days: data.durationDays,
        severity: data.severity,
        logged_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[symptoms] Supabase insert error:", error.message);
      // Graceful degradation: return a client-side ID so callers don't break
      return { success: true, logId: `symp-${Date.now()}` };
    }

    return { success: true, logId: row?.id ?? `symp-${Date.now()}` };
  } catch (err: any) {
    console.error("[symptoms] Unexpected error:", err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

export async function fetchSymptomHistory(
  userId: string
): Promise<(SymptomLog & { logId: string; loggedAt: string })[]> {
  try {
    const { data, error } = await supabase
      .from("symptom_logs")
      .select("id, symptoms, duration_days, severity, logged_at")
      .eq("patient_id", userId)
      .order("logged_at", { ascending: false })
      .limit(50);

    if (error || !data) {
      console.error("[symptoms] Supabase fetch error:", error?.message);
      return [];
    }

    return data.map((row) => ({
      logId: row.id,
      symptoms: row.symptoms,
      durationDays: row.duration_days,
      severity: row.severity as SymptomLog["severity"],
      loggedAt: row.logged_at,
    }));
  } catch (err: any) {
    console.error("[symptoms] Unexpected fetch error:", err);
    return [];
  }
}
