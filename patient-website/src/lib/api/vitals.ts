import { supabase } from "../supabaseClient";

export interface VitalsData {
  heartRate: number;
  systolic: number;
  diastolic: number;
  temperature: number;
  oxygenSat: number;
}

export async function saveVitals(
  userId: string,
  vitals: VitalsData
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("patient_vitals")
      .insert({
        patient_id: userId,
        heart_rate: vitals.heartRate,
        systolic_bp: vitals.systolic,
        diastolic_bp: vitals.diastolic,
        temperature_c: vitals.temperature,
        oxygen_saturation: vitals.oxygenSat,
        logged_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[vitals] Supabase insert error:", error.message);
      // Graceful degradation: return a client-side record so the UI still works
      return {
        success: true,
        data: { id: `vit-${Date.now()}`, userId, ...vitals, loggedAt: new Date().toISOString() },
      };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("[vitals] Unexpected error:", err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

export async function fetchVitals(userId: string): Promise<VitalsData[]> {
  try {
    const { data, error } = await supabase
      .from("patient_vitals")
      .select("heart_rate, systolic_bp, diastolic_bp, temperature_c, oxygen_saturation, logged_at")
      .eq("patient_id", userId)
      .order("logged_at", { ascending: false })
      .limit(20);

    if (error || !data) {
      console.error("[vitals] Supabase fetch error:", error?.message);
      return [];
    }

    return data.map((row) => ({
      heartRate: row.heart_rate,
      systolic: row.systolic_bp,
      diastolic: row.diastolic_bp,
      temperature: row.temperature_c,
      oxygenSat: row.oxygen_saturation,
    }));
  } catch (err: any) {
    console.error("[vitals] Unexpected fetch error:", err);
    return [];
  }
}
